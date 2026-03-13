# ESP32 Firmware Install

## Purpose

The firmware turns NanoMind into a device-aware stack instead of a browser-only console.

## Prerequisites

- ESP-IDF 5.x
- ESP32-S3 target hardware
- USB serial access for flashing

## Configure

Edit:

- [ai-assistant/firmware/main/config.h](../../ai-assistant/firmware/main/config.h)

Set:

- `WIFI_SSID`
- `WIFI_PASS`
- `SERVER_URI`
- `DEVICE_ID`
- `AUTH_TOKEN`

## Build

```bash
cd ai-assistant/firmware
idf.py set-target esp32s3
idf.py build
```

## Flash

```bash
idf.py -p /dev/ttyUSB0 flash monitor
```

## Main Firmware Files

- [ai-assistant/firmware/main/main.c](../../ai-assistant/firmware/main/main.c)
- [ai-assistant/firmware/main/config.h](../../ai-assistant/firmware/main/config.h)
- [ai-assistant/firmware/main/wifi_manager.c](../../ai-assistant/firmware/main/wifi_manager.c)
- [ai-assistant/firmware/main/ai_client.cpp](../../ai-assistant/firmware/main/ai_client.cpp)
- [ai-assistant/firmware/main/input_handler.c](../../ai-assistant/firmware/main/input_handler.c)
- [ai-assistant/firmware/main/response_handler.c](../../ai-assistant/firmware/main/response_handler.c)

## Runtime Notes

- Wi-Fi starts first.
- The AI connection task starts after a short delay.
- Requests go over WebSocket to the edge server.
- Responses are parsed from the server JSON response body.
