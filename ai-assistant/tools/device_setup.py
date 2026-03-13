import os
import json

def generate_config():
    ssid = input("Enter WiFi SSID: ")
    password = input("Enter WiFi Password: ")
    server_ip = input("Enter Edge Server IP: ")
    
    config_content = f"""#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID "{ssid}"
#define WIFI_PASS "{password}"

#define SERVER_URI "ws://{server_ip}:3000/assistant"
#define DEVICE_ID "esp32_s3_01"
#define AUTH_TOKEN "super_secret_token_123"

#endif // CONFIG_H
"""
    
    path = os.path.join("..", "firmware", "main", "config.h")
    with open(path, "w") as f:
        f.write(config_content)
    print(f"Configuration written to {path}")

if __name__ == "__main__":
    generate_config()
