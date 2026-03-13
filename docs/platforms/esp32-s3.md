# ESP32-S3 Device Client

## Purpose

The ESP32-S3 firmware is the thin client layer for NanoMind.

## Responsibilities

- connect to Wi-Fi
- connect to the edge server over WebSocket
- send user/device queries
- parse AI responses

## File Map

- [main.c](../../ai-assistant/firmware/main/main.c)
- [config.h](../../ai-assistant/firmware/main/config.h)
- [wifi_manager.c](../../ai-assistant/firmware/main/wifi_manager.c)
- [ai_client.cpp](../../ai-assistant/firmware/main/ai_client.cpp)
- [input_handler.c](../../ai-assistant/firmware/main/input_handler.c)
- [response_handler.c](../../ai-assistant/firmware/main/response_handler.c)

## Current Protocol

The firmware sends:

- `device_id`
- `token`
- `query`
- `timestamp`

The firmware expects a JSON response with a `response` field.

See:

- [Protocol](../gateway-ops/protocol.md)
