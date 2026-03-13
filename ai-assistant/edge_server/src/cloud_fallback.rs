use reqwest::Client;
use serde_json::json;
use crate::config::Config;

pub struct CloudFallback {
    client: Client,
    config: Config,
}

impl CloudFallback {
    pub fn new(config: Config) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    pub async fn query(&self, query: &str) -> String {
        if self.config.cloud_api_key.is_empty() {
            return "Error: Local LLM offline and no cloud fallback configured.".to_string();
        }

        let url = "https://api.openai.com/v1/chat/completions";
        let payload = json!({
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": query}]
        });

        match self.client.post(url)
            .bearer_auth(&self.config.cloud_api_key)
            .json(&payload)
            .send()
            .await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(content) = json["choices"][0]["message"]["content"].as_str() {
                        return content.to_string();
                    }
                }
            }
            _ => {}
        }

        "Error: Both local and cloud LLMs failed.".to_string()
    }
}
