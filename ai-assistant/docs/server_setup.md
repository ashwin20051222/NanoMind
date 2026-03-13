# Server Setup Instructions

1. Install Rust (rustup).
2. Install Ollama and pull a model: `ollama run llama3`.
3. Navigate to `edge_server/`.
4. Create a `.env` file with:
   ```
   PORT=3000
   OLLAMA_URL=http://localhost:11434
   CLOUD_API_KEY=your_openai_key
   AUTH_TOKEN=super_secret_token_123
   ```
5. Run `cargo run --release`.
