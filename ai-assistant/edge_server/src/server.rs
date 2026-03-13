use axum::{
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Router,
    extract::State,
    Json,
};
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use subtle::ConstantTimeEq;
use serde::Serialize;

use crate::config::Config;
use crate::websocket::ws_handler;
use crate::session_manager::SessionManager;
use crate::llm_router::LlmRouter;

pub struct AppState {
    pub config: Config,
    pub session_manager: Arc<SessionManager>,
    pub llm_router: Arc<LlmRouter>,
}

pub async fn start_server(config: Config) {
    let state = Arc::new(AppState {
        config: config.clone(),
        session_manager: Arc::new(SessionManager::new()),
        llm_router: Arc::new(LlmRouter::new(config.clone())),
    });

    let app = Router::new()
        .route("/query", post(handle_query))
        .route("/assistant", get(ws_handler))
        .route("/devices", get(handle_devices))
        .route("/integrations", get(handle_integrations_status))
        .route("/pairing/status", get(handle_pairing_status))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_headers(Any)
                .allow_methods(Any),
        );

    let addr = format!("0.0.0.0:{}", config.port);
    let listener = TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Listening on {}", addr);

    axum::serve(listener, app).await.unwrap();
}

#[derive(serde::Deserialize)]
struct QueryRequest {
    device_id: String,
    token: String,
    query: String,
}

#[derive(serde::Serialize)]
struct QueryResponse {
    response: String,
}

async fn handle_query(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<QueryRequest>,
) -> Result<Json<QueryResponse>, (StatusCode, &'static str)> {
    let is_valid = payload.token.as_bytes().ct_eq(state.config.auth_token.as_bytes());
    
    if !bool::from(is_valid) {
        tracing::warn!("Unauthorized HTTP access attempt from device: {}", payload.device_id);
        return Err((StatusCode::UNAUTHORIZED, "Unauthorized"));
    }

    state.session_manager.update_session(&payload.device_id, &payload.query);
    let response = state.llm_router.route_query(&payload.device_id, &payload.query).await;
    Ok(Json(QueryResponse { response: response.response }))
}

#[derive(Serialize)]
struct IntegrationStatus {
    connected: bool,
    configured: bool,
    connectable: bool,
    state: String,
    scopes: Vec<String>,
    note: String,
}

#[derive(Serialize)]
struct IntegrationStatusResponse {
    google: IntegrationStatus,
    meta: IntegrationStatus,
}

#[derive(Serialize)]
struct PairingStatusResponse {
    supported: bool,
    state: String,
    token: Option<String>,
    qr_text: Option<String>,
    expires_in: Option<u64>,
    note: String,
}

fn header_token(headers: &HeaderMap) -> Option<String> {
    if let Some(raw) = headers.get("x-auth-token").and_then(|value| value.to_str().ok()) {
        return Some(raw.to_string());
    }

    headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .map(|value| value.to_string())
}

fn is_authorized(headers: &HeaderMap, expected: &str) -> bool {
    header_token(headers)
        .map(|token| bool::from(token.as_bytes().ct_eq(expected.as_bytes())))
        .unwrap_or(false)
}

fn build_integration_status(env_key: &str, missing_note: &str) -> IntegrationStatus {
    let configured = std::env::var(env_key)
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);

    let note = if configured {
        "Credentials exist on the server, but the connect flow is not implemented yet.".to_string()
    } else {
        missing_note.to_string()
    };

    IntegrationStatus {
        connected: false,
        configured,
        connectable: configured,
        state: if configured {
            "not_connected".to_string()
        } else {
            "not_configured".to_string()
        },
        scopes: Vec::new(),
        note,
    }
}

async fn handle_devices(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<Vec<crate::session_manager::DeviceSnapshot>>, (StatusCode, &'static str)> {
    if !is_authorized(&headers, &state.config.auth_token) {
        return Err((StatusCode::UNAUTHORIZED, "Unauthorized"));
    }

    Ok(Json(state.session_manager.list_devices()))
}

async fn handle_integrations_status(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<IntegrationStatusResponse>, (StatusCode, &'static str)> {
    if !is_authorized(&headers, &state.config.auth_token) {
        return Err((StatusCode::UNAUTHORIZED, "Unauthorized"));
    }

    Ok(Json(IntegrationStatusResponse {
        google: build_integration_status("GOOGLE_CLIENT_ID", "Google credentials are not configured on the server."),
        meta: build_integration_status("META_APP_ID", "Meta credentials are not configured on the server."),
    }))
}

async fn handle_pairing_status(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<PairingStatusResponse>, (StatusCode, &'static str)> {
    if !is_authorized(&headers, &state.config.auth_token) {
        return Err((StatusCode::UNAUTHORIZED, "Unauthorized"));
    }

    Ok(Json(PairingStatusResponse {
        supported: false,
        state: "not_implemented".to_string(),
        token: None,
        qr_text: None,
        expires_in: None,
        note: "Device pairing backend is not implemented yet. No QR or token is issued.".to_string(),
    }))
}
