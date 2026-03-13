# Implementation Guide: Edge, Cloud, and Hybrid Routing

This document provides a detailed, step-by-step procedure for implementing and testing the hybrid AI architecture for **NanoMind**. The system is designed to be **Local-First (Edge)** with a **Cloud Fallback**, ensuring 24/7 reliability, low latency, and maximum privacy.

---

## Phase 0: Clone the Repository

Before starting, clone the NanoMind repository and navigate into it:
```bash
git clone https://github.com/yourusername/NanoMind.git
cd NanoMind
```

---

## The Hybrid Architecture Concept

The Rust Edge Server acts as a **Router** and **Session Manager**. 
1. **Edge First:** When the ESP32 sends a query, the Rust server immediately attempts to resolve it using a local LLM (Ollama) running on the same network. This costs nothing per query and keeps data strictly local.
2. **Cloud Fallback:** If the local LLM is offline, overloaded, or crashes, the Rust server detects the HTTP failure and instantly routes the exact same prompt to a Cloud LLM (OpenAI). 
3. **Seamless to the Device:** The ESP32 does not know or care whether the response came from the Edge or the Cloud. It simply receives the final JSON response over its WebSocket.

---

## Phase 1: Implementing the Edge (Local LLM)

To run the AI locally, we use **Ollama**, which serves models via a local HTTP API.

### 1. Install and Start Ollama
1. Download and install Ollama from [ollama.com](https://ollama.com).
2. Open a terminal and pull a lightweight, fast model (e.g., Llama 3):
   ```bash
   ollama run llama3
   ```
3. Verify Ollama is running by visiting `http://localhost:11434` in your browser. You should see "Ollama is running".

### 2. Configure the Rust Edge Server
1. Navigate to the `edge_server` directory:
   ```bash
   cd edge_server
   ```
2. Create a `.env` file in this directory:
   ```env
   PORT=3000
   OLLAMA_URL=http://localhost:11434
   AUTH_TOKEN=super_secret_token_123
   # Leave CLOUD_API_KEY blank for now to test pure Edge
   CLOUD_API_KEY=
   ```
3. Start the Rust server:
   ```bash
   cargo run --release
   ```
   *The server is now listening on port 3000 and will route queries to Ollama.*

---

## Phase 2: Implementing the Cloud Fallback

To ensure the assistant never goes down, we configure OpenAI as the fallback.

### 1. Obtain a Cloud API Key
1. Go to the [OpenAI Platform](https://platform.openai.com/).
2. Generate a new API Key.

### 2. Update the Rust Server Configuration
1. Open your `edge_server/.env` file and add the key:
   ```env
   PORT=3000
   OLLAMA_URL=http://localhost:11434
   AUTH_TOKEN=super_secret_token_123
   CLOUD_API_KEY=sk-your-actual-openai-api-key
   ```
2. Restart the Rust server:
   ```bash
   cargo run --release
   ```

### How the Code Handles the Combination
Look at `edge_server/src/llm_router.rs`. The logic is strictly sequential:
1. It attempts a `POST` request to `OLLAMA_URL`.
2. If the response is `200 OK`, it parses the JSON and returns it to the ESP32.
3. If the request times out, fails to connect, or returns an error (e.g., Ollama crashed), it matches the `_` (wildcard) arm of the `match` statement.
4. It logs a warning: `"Local LLM failed, falling back to cloud"` and calls `self.cloud_fallback.query(query).await`.

---

## Phase 3: Implementing the ESP32 Device

Now we connect the hardware to our hybrid server.

### 1. Generate the Configuration
1. Find the IP address of the laptop/computer running the Rust server (e.g., `192.168.1.100`).
2. Navigate to the tools directory and run the setup script:
   ```bash
   cd tools
   python3 device_setup.py
   ```
3. Enter your WiFi SSID, WiFi Password, and the Edge Server IP when prompted. This generates `firmware/main/config.h`.

### 2. Flash the Firmware
1. Open the ESP-IDF terminal.
2. Navigate to the firmware directory:
   ```bash
   cd ../firmware
   ```
3. Set the target to your specific ESP32 board (e.g., ESP32-S3):
   ```bash
   idf.py set-target esp32s3
   ```
4. Build, flash, and monitor the device (replace `/dev/ttyUSB0` with your actual port):
   ```bash
   idf.py -p /dev/ttyUSB0 flash monitor
   ```

---

## Phase 4: Testing the Hybrid Combination

To prove the system works as a resilient hybrid, perform the following tests while watching the ESP32 serial monitor and the Rust server logs.

### Test 1: Pure Edge Execution
1. Ensure Ollama is running (`ollama serve`).
2. Ensure the Rust server is running.
3. Power on the ESP32.
4. **Observation:** The ESP32 connects via WebSocket. It sends a query ("What is the weather like today?"). The Rust server routes it to Ollama. You will see the response generated locally and printed on the ESP32 serial monitor.

### Test 2: Triggering the Cloud Fallback
1. **Kill the local LLM:** Stop the Ollama service completely (e.g., `sudo systemctl stop ollama` or close the Ollama terminal).
2. Wait for the ESP32 to send its next query (it sends one every 30 seconds based on `input_handler.c`).
3. **Observation:**
   - The Rust server will attempt to contact `http://localhost:11434`.
   - The connection will be refused.
   - The Rust server terminal will print: `WARN: Local LLM failed, falling back to cloud`.
   - The Rust server instantly forwards the prompt to OpenAI.
   - The ESP32 receives the response from OpenAI seamlessly.

### Test 3: Total Outage Handling
1. Keep Ollama offline.
2. Remove the `CLOUD_API_KEY` from the `.env` file and restart the Rust server.
3. **Observation:** The Rust server will fail to hit Ollama, fallback to the cloud, realize there is no API key, and return the string: `"Error: Local LLM offline and no cloud fallback configured."` to the ESP32. The ESP32 handles this gracefully without crashing.
