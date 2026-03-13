use reqwest::Client;
use serde_json::json;
use crate::config::Config;
use crate::cloud_fallback::CloudFallback;
use crate::integrations::{handle_integrations, IntegrationResult};

pub struct RoutedResponse {
    pub response: String,
    pub source: &'static str,
}

pub struct LlmRouter {
    client: Client,
    config: Config,
    cloud_fallback: CloudFallback,
}

impl LlmRouter {
    pub fn new(config: Config) -> Self {
        Self {
            client: Client::new(),
            config: config.clone(),
            cloud_fallback: CloudFallback::new(config),
        }
    }

    pub async fn route_query(&self, _device_id: &str, query: &str) -> RoutedResponse {
        if let IntegrationResult::Handled(response) = handle_integrations(query).await {
            return RoutedResponse {
                response,
                source: "local",
            };
        }

        let ollama_url = format!("{}/api/generate", self.config.ollama_url);
        
        let payload = json!({
            "model": "llama3",
            "prompt": query,
            "stream": false
        });

        match self.client.post(&ollama_url).json(&payload).send().await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(res) = json["response"].as_str() {
                        return RoutedResponse {
                            response: res.to_string(),
                            source: "local",
                        };
                    }
                }
            }
            _ => {
                tracing::warn!("Local LLM failed, falling back to cloud");
            }
        }

        RoutedResponse {
            response: self.cloud_fallback.query(query).await,
            source: "cloud",
        }
    }
}
