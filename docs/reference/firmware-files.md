# Firmware Files

This page lists the firmware files one by one.

## Main Firmware Sources

- [main.c](../../ai-assistant/firmware/main/main.c): task orchestration from `app_main`.
- [config.h](../../ai-assistant/firmware/main/config.h): Wi-Fi, endpoint, device ID, and auth token constants.
- [wifi_manager.c](../../ai-assistant/firmware/main/wifi_manager.c): station-mode Wi-Fi setup and reconnection handling.
- [ai_client.cpp](../../ai-assistant/firmware/main/ai_client.cpp): WebSocket connection and query send path.
- [input_handler.c](../../ai-assistant/firmware/main/input_handler.c): input task source.
- [response_handler.c](../../ai-assistant/firmware/main/response_handler.c): parses server JSON responses.
- [CMakeLists.txt](../../ai-assistant/firmware/main/CMakeLists.txt): component build rules.

## Current Firmware Behavior

- boot tasks
- connect Wi-Fi
- connect WebSocket
- send JSON queries
- parse JSON responses

## Current Limitations

- static credentials in header file
- simple response format only
- no richer streaming protocol handling
