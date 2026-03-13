idf_component_register(SRCS "main.c" "wifi_manager.c" "ai_client.cpp" "input_handler.c" "response_handler.c"
                    INCLUDE_DIRS "."
                    REQUIRES esp_wifi nvs_flash esp_websocket_client json)
