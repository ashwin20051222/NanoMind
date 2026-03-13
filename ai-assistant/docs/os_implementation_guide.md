# Comprehensive OS Implementation & Hybrid Routing Guide

This document provides an exhaustive, production-grade manual for deploying the **NanoMind** system across **Ubuntu, Arch Linux, Windows 11, and macOS**. It also details the exact implementation of the **Edge (Local), Cloud (Fallback), and Hybrid** routing mechanisms.

---

## PART 0: Clone the Repository (All Platforms)

Before proceeding with your OS-specific setup, clone the NanoMind repository:
```bash
git clone https://github.com/yourusername/NanoMind.git
cd NanoMind
```

---

## PART 1: The Hybrid Routing Architecture (Edge + Cloud)

The system is designed with a **Local-First (Edge) with Cloud Fallback** architecture. This ensures 24/7 reliability, zero-latency local processing when possible, and guaranteed uptime via cloud APIs when local resources fail.

### 1. The Edge (Local LLM)
- **Component:** Ollama running `llama3` (or similar).
- **Implementation:** The Rust server (`llm_router.rs`) receives a WebSocket message from the ESP32. It immediately constructs an HTTP POST request to `http://localhost:11434/api/generate`.
- **Advantage:** 100% private, zero recurring cost, works offline.

### 2. The Cloud (Fallback LLM)
- **Component:** OpenAI API (GPT-3.5-turbo / GPT-4).
- **Implementation:** Configured via the `CLOUD_API_KEY` in the `.env` file. Handled by `cloud_fallback.rs`.
- **Advantage:** Highly capable, acts as a safety net if the local machine loses power, crashes, or Ollama service stops.

### 3. The Hybrid Combination
- **Implementation:** The Rust server uses a `match` statement on the local HTTP request. 
  - If `Ok(response)` and status is `200`, it returns the Edge response.
  - If `Err(_)` (connection refused, timeout, DNS failure), it logs a warning and instantly triggers `self.cloud_fallback.query()`.
  - The ESP32 device is completely unaware of this routing. It simply waits for a JSON response containing `{"response": "..."}`.

---

## PART 2: Ubuntu (22.04 / 24.04 LTS) Implementation

Ubuntu is the standard deployment environment for ESP-IDF and Rust.

### 2.1 System Preparation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git wget flex bison gperf python3 python3-pip python3-venv cmake ninja-build ccache libffi-dev libssl-dev dfu-util libusb-1.0-0 build-essential curl pkg-config
```

### 2.2 ESP-IDF Firmware Toolchain
```bash
# 1. Clone the repository
mkdir -p ~/esp
cd ~/esp
git clone -b v5.2.1 --recursive https://github.com/espressif/esp-idf.git

# 2. Install the toolchain for ESP32-S3
cd ~/esp/esp-idf
./install.sh esp32s3

# 3. Set up environment variables
echo "source $HOME/esp/esp-idf/export.sh" >> ~/.bashrc
source ~/.bashrc

# 4. Fix USB Permissions (Crucial for flashing without sudo)
sudo usermod -aG dialout $USER
# NOTE: Log out and log back in for group changes to apply.
```

### 2.3 Rust Edge Server Setup
```bash
# 1. Install Rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 2. Verify installation
rustc --version
cargo --version
```

### 2.4 Ollama (Edge AI) Setup
```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Ensure service is running
sudo systemctl enable ollama
sudo systemctl start ollama

# 3. Pull the model
ollama run llama3
```

---

## PART 3: Arch Linux Implementation

Arch Linux requires careful handling of Python environments (PEP 668) and uses `uucp` for serial access.

### 3.1 System Preparation
```bash
sudo pacman -Syu
sudo pacman -S base-devel git python python-pip python-virtualenv cmake ninja dfu-util libusb wget curl pkgconf
```

### 3.2 ESP-IDF Firmware Toolchain
```bash
# 1. Clone the repository
mkdir -p ~/esp
cd ~/esp
git clone -b v5.2.1 --recursive https://github.com/espressif/esp-idf.git

# 2. Install the toolchain (ESP-IDF handles the Python venv automatically)
cd ~/esp/esp-idf
./install.sh esp32s3

# 3. Set up environment variables
echo "alias get_idf='. $HOME/esp/esp-idf/export.sh'" >> ~/.bashrc
source ~/.bashrc

# 4. Fix USB Permissions
sudo usermod -aG uucp $USER
# NOTE: Log out and log back in.
```

### 3.3 Rust Edge Server Setup
```bash
# Arch has Rust in official repos, but rustup is safer for cross-compilation
sudo pacman -S rustup
rustup default stable
```

### 3.4 Ollama (Edge AI) Setup
```bash
# 1. Install from official repos
sudo pacman -S ollama

# 2. Enable and start service
sudo systemctl enable --now ollama

# 3. Pull the model
ollama run llama3
```

---

## PART 4: Windows 11 Implementation

Windows requires MSVC build tools for Rust and the official Espressif installer.

### 4.1 System Preparation
1. **Git:** Install from [git-scm.com](https://git-scm.com/).
2. **Python:** Install Python 3.11+ from [python.org](https://python.org). Check **"Add Python to PATH"**.
3. **C++ Build Tools:** Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Select **"Desktop development with C++"**.

### 4.2 ESP-IDF Firmware Toolchain
1. Download the **ESP-IDF Online Installer** from [espressif.com](https://dl.espressif.com/dl/esp-idf/).
2. Run the installer, select **ESP-IDF v5.2.1**, and install for ESP32-S3.
3. Use the **"ESP-IDF Command Prompt"** shortcut created on your desktop for all firmware compilation.

### 4.3 Rust Edge Server Setup
1. Download `rustup-init.exe` from [rustup.rs](https://rustup.rs/).
2. Run it and press `1` to proceed with the MSVC toolchain.

### 4.4 Ollama (Edge AI) Setup
1. Download the Windows installer from [ollama.com/download/windows](https://ollama.com/download/windows).
2. Run the installer.
3. Open PowerShell and run: `ollama run llama3`.

---

## PART 5: macOS (Apple Silicon & Intel) Implementation

macOS relies heavily on Homebrew. Apple Silicon (M-series) is highly optimized for local LLMs.

### 5.1 System Preparation
```bash
# 1. Install Xcode Command Line Tools
xcode-select --install

# 2. Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. Install dependencies
brew install cmake ninja dfu-util python3
```

### 5.2 ESP-IDF Firmware Toolchain
```bash
# 1. Clone the repository
mkdir -p ~/esp
cd ~/esp
git clone -b v5.2.1 --recursive https://github.com/espressif/esp-idf.git

# 2. Install the toolchain
cd ~/esp/esp-idf
./install.sh esp32s3

# 3. Set up environment variables
echo "alias get_idf='. $HOME/esp/esp-idf/export.sh'" >> ~/.zshrc
source ~/.zshrc
```

### 5.3 Rust Edge Server Setup
```bash
brew install rustup-init
rustup-init
source "$HOME/.cargo/env"
```

### 5.4 Ollama (Edge AI) Setup
1. Download the macOS app from [ollama.com/download/mac](https://ollama.com/download/mac).
2. Move to Applications and open it.
3. Open terminal and run: `ollama run llama3`.

---

## PART 6: Execution & Hybrid Validation (All Platforms)

### 6.1 Configure and Run the Edge Server
1. Navigate to the server directory:
   ```bash
   cd edge_server
   ```
2. Create the `.env` file:
   ```env
   PORT=3000
   OLLAMA_URL=http://localhost:11434
   AUTH_TOKEN=super_secret_token_123
   CLOUD_API_KEY=sk-your-openai-api-key
   ```
3. Run the server:
   ```bash
   cargo run --release
   ```

### 6.2 Configure and Flash the ESP32
1. Open your ESP-IDF terminal (or run `get_idf`).
2. Configure the device:
   ```bash
   cd tools
   python3 device_setup.py
   ```
3. Build and flash:
   ```bash
   cd ../firmware
   idf.py set-target esp32s3
   idf.py build
   
   # Linux: idf.py -p /dev/ttyUSB0 flash monitor
   # Windows: idf.py -p COM3 flash monitor
   # macOS: idf.py -p /dev/cu.usbserial-XXXX flash monitor
   ```

### 6.3 Validating the Hybrid Routing
1. **Test Edge:** With Ollama running, watch the ESP32 logs. The response will be fast and generated locally.
2. **Test Cloud Fallback:** Kill the Ollama process (`sudo systemctl stop ollama` or quit the app). Watch the Rust server logs. You will see `WARN: Local LLM failed, falling back to cloud`. The ESP32 will seamlessly receive the response from OpenAI.
3. **Test Total Outage:** Remove the `CLOUD_API_KEY` and keep Ollama offline. The ESP32 will receive a graceful error message indicating both systems are down, preventing a device crash.
