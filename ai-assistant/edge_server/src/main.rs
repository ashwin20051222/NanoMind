mod server;
mod websocket;
mod llm_router;
mod session_manager;
mod cloud_fallback;
mod config;
mod integrations;

use tracing_subscriber;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    tracing::info!("Starting Edge AI Server...");

    let config = config::load_config();
    server::start_server(config).await;
}
