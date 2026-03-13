use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use subtle::ConstantTimeEq;

use crate::server::AppState;

#[derive(Deserialize, Debug)]
struct LegacyWsRequest {
    device_id: String,
    token: String,
    query: String,
    timestamp: u64,
}

#[derive(Deserialize, Debug)]
struct BrowserAuthRequest {
    token: String,
}

#[derive(Deserialize, Debug)]
struct BrowserQueryPayload {
    text: String,
}

#[derive(Deserialize, Debug)]
struct BrowserQueryRequest {
    request_id: String,
    device_id: Option<String>,
    payload: BrowserQueryPayload,
}

#[derive(Serialize)]
struct AuthOkResponse {
    r#type: &'static str,
    devices: Vec<crate::session_manager::DeviceSnapshot>,
}

#[derive(Serialize)]
struct ErrorResponse<'a> {
    r#type: &'static str,
    request_id: Option<&'a str>,
    error: &'a str,
}

#[derive(Serialize)]
struct ResponseChunkResponse<'a> {
    r#type: &'static str,
    request_id: &'a str,
    chunk: &'a str,
    is_final: bool,
    edge_source: &'a str,
}

#[derive(Serialize)]
struct ResponseEndResponse<'a> {
    r#type: &'static str,
    request_id: &'a str,
    content: &'a str,
    source: &'a str,
}

#[derive(Serialize)]
struct LegacyWsResponse {
    response: String,
}

fn is_token_valid(candidate: &str, expected: &str) -> bool {
    bool::from(candidate.as_bytes().ct_eq(expected.as_bytes()))
}

async fn send_json<T: Serialize>(sender: &mut futures_util::stream::SplitSink<WebSocket, Message>, payload: &T) -> bool {
    match serde_json::to_string(payload) {
        Ok(json) => sender.send(Message::Text(json)).await.is_ok(),
        Err(error) => {
            tracing::error!("Failed to serialize WebSocket payload: {}", error);
            false
        }
    }
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut authenticated = false;

    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            let value: Value = match serde_json::from_str(&text) {
                Ok(value) => value,
                Err(error) => {
                    tracing::warn!("Failed to parse WebSocket JSON: {}", error);
                    continue;
                }
            };

            match value.get("type").and_then(Value::as_str) {
                Some("auth") => {
                    let request = match serde_json::from_value::<BrowserAuthRequest>(value) {
                        Ok(request) => request,
                        Err(error) => {
                            tracing::warn!("Invalid auth frame: {}", error);
                            let _ = send_json(
                                &mut sender,
                                &ErrorResponse {
                                    r#type: "error",
                                    request_id: None,
                                    error: "Invalid auth frame",
                                },
                            )
                            .await;
                            continue;
                        }
                    };

                    if !is_token_valid(&request.token, &state.config.auth_token) {
                        tracing::warn!("Unauthorized WebSocket auth attempt");
                        let _ = send_json(
                            &mut sender,
                            &ErrorResponse {
                                r#type: "error",
                                request_id: None,
                                error: "Unauthorized",
                            },
                        )
                        .await;
                        let _ = sender.close().await;
                        break;
                    }

                    authenticated = true;
                    let devices = state.session_manager.list_devices();
                    if !send_json(
                        &mut sender,
                        &AuthOkResponse {
                            r#type: "auth_ok",
                            devices,
                        },
                    )
                    .await
                    {
                        break;
                    }
                }
                Some("query") => {
                    if !authenticated {
                        let _ = send_json(
                            &mut sender,
                            &ErrorResponse {
                                r#type: "error",
                                request_id: None,
                                error: "Authenticate before sending queries",
                            },
                        )
                        .await;
                        continue;
                    }

                    let request = match serde_json::from_value::<BrowserQueryRequest>(value) {
                        Ok(request) => request,
                        Err(error) => {
                            tracing::warn!("Invalid query frame: {}", error);
                            let _ = send_json(
                                &mut sender,
                                &ErrorResponse {
                                    r#type: "error",
                                    request_id: None,
                                    error: "Invalid query frame",
                                },
                            )
                            .await;
                            continue;
                        }
                    };

                    let prompt = request.payload.text.trim();
                    if prompt.is_empty() {
                        let _ = send_json(
                            &mut sender,
                            &ErrorResponse {
                                r#type: "error",
                                request_id: Some(&request.request_id),
                                error: "Prompt cannot be empty",
                            },
                        )
                        .await;
                        continue;
                    }

                    let device_id = request
                        .device_id
                        .as_deref()
                        .filter(|value| !value.trim().is_empty())
                        .unwrap_or("browser-control-ui");

                    state.session_manager.update_session(device_id, prompt);
                    let routed = state.llm_router.route_query(device_id, prompt).await;

                    if !send_json(
                        &mut sender,
                        &ResponseChunkResponse {
                            r#type: "response_chunk",
                            request_id: &request.request_id,
                            chunk: &routed.response,
                            is_final: true,
                            edge_source: routed.source,
                        },
                    )
                    .await
                    {
                        break;
                    }

                    if !send_json(
                        &mut sender,
                        &ResponseEndResponse {
                            r#type: "response_end",
                            request_id: &request.request_id,
                            content: &routed.response,
                            source: routed.source,
                        },
                    )
                    .await
                    {
                        break;
                    }
                }
                Some("cancel") => {
                    continue;
                }
                _ => {
                    let legacy = match serde_json::from_str::<LegacyWsRequest>(&text) {
                        Ok(request) => request,
                        Err(_) => {
                            tracing::warn!("Unknown WebSocket frame: {}", text);
                            continue;
                        }
                    };

                    if !is_token_valid(&legacy.token, &state.config.auth_token) {
                        tracing::warn!(
                            "Unauthorized legacy WebSocket access attempt from device: {}",
                            legacy.device_id
                        );
                        let _ = sender
                            .send(Message::Text(r#"{"error":"Unauthorized"}"#.into()))
                            .await;
                        let _ = sender.close().await;
                        break;
                    }

                    tracing::info!(
                        "Received legacy query from {} at {}",
                        legacy.device_id,
                        legacy.timestamp
                    );
                    state
                        .session_manager
                        .update_session(&legacy.device_id, &legacy.query);

                    let routed = state
                        .llm_router
                        .route_query(&legacy.device_id, &legacy.query)
                        .await;
                    let response = LegacyWsResponse {
                        response: routed.response,
                    };

                    if !send_json(&mut sender, &response).await {
                        break;
                    }
                }
            }
        }
    }
}
