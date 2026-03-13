use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub ollama_url: String,
    pub cloud_api_key: String,
    pub auth_token: String,
}

pub fn load_config() -> Config {
    dotenv::dotenv().ok();
    Config {
        port: env::var("PORT").unwrap_or_else(|_| "3000".to_string()).parse().unwrap(),
        ollama_url: env::var("OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434".to_string()),
        cloud_api_key: env::var("CLOUD_API_KEY").unwrap_or_else(|_| "".to_string()),
        auth_token: env::var("AUTH_TOKEN").unwrap_or_else(|_| "super_secret_token_123".to_string()),
    }
}
