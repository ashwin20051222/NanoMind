#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_websocket_client.h"
#include "cJSON.h"
#include "config.h"
#include <string.h>

static const char *TAG = "ai_client";
static esp_websocket_client_handle_t client = NULL;

extern "C" void handle_response(const char* response_json);

static void websocket_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    esp_websocket_event_data_t *data = (esp_websocket_event_data_t *)event_data;
    switch (event_id) {
        case WEBSOCKET_EVENT_CONNECTED:
            ESP_LOGI(TAG, "WEBSOCKET_EVENT_CONNECTED");
            break;
        case WEBSOCKET_EVENT_DISCONNECTED:
            ESP_LOGI(TAG, "WEBSOCKET_EVENT_DISCONNECTED");
            break;
        case WEBSOCKET_EVENT_DATA:
            ESP_LOGI(TAG, "WEBSOCKET_EVENT_DATA");
            if (data->op_code == 0x01 && data->data_len > 0) { // Text frame
                char *resp = (char*)malloc(data->data_len + 1);
                memcpy(resp, data->data_ptr, data->data_len);
                resp[data->data_len] = '\0';
                handle_response(resp);
                free(resp);
            }
            break;
        case WEBSOCKET_EVENT_ERROR:
            ESP_LOGI(TAG, "WEBSOCKET_EVENT_ERROR");
            break;
    }
}

extern "C" void ai_send_query(const char* query) {
    if (client == NULL || !esp_websocket_client_is_connected(client)) {
        ESP_LOGE(TAG, "WebSocket not connected");
        return;
    }

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "device_id", DEVICE_ID);
    cJSON_AddStringToObject(root, "token", AUTH_TOKEN);
    cJSON_AddStringToObject(root, "query", query);
    cJSON_AddNumberToObject(root, "timestamp", xTaskGetTickCount());

    char *json_str = cJSON_PrintUnformatted(root);
    esp_websocket_client_send_text(client, json_str, strlen(json_str), portMAX_DELAY);
    
    ESP_LOGI(TAG, "Sent: %s", json_str);

    free(json_str);
    cJSON_Delete(root);
}

extern "C" void ai_connection_task(void *pvParameters) {
    esp_websocket_client_config_t websocket_cfg = {};
    websocket_cfg.uri = SERVER_URI;

    client = esp_websocket_client_init(&websocket_cfg);
    esp_websocket_register_events(client, WEBSOCKET_EVENT_ANY, websocket_event_handler, (void *)client);

    esp_websocket_client_start(client);

    while (1) {
        if (!esp_websocket_client_is_connected(client)) {
            ESP_LOGW(TAG, "Reconnecting...");
            esp_websocket_client_start(client);
        }
        vTaskDelay(5000 / portTICK_PERIOD_MS);
    }
}
