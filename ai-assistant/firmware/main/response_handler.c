#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "cJSON.h"

static const char *TAG = "response_handler";

void handle_response(const char* response_json) {
    ESP_LOGI(TAG, "Raw response: %s", response_json);
    
    cJSON *root = cJSON_Parse(response_json);
    if (root == NULL) {
        ESP_LOGE(TAG, "Failed to parse JSON");
        return;
    }

    cJSON *response_item = cJSON_GetObjectItem(root, "response");
    if (cJSON_IsString(response_item) && (response_item->valuestring != NULL)) {
        ESP_LOGI(TAG, "AI Assistant: %s", response_item->valuestring);
        // Here you would output to a speaker or serial display
    } else {
        ESP_LOGW(TAG, "Response missing 'response' field");
    }

    cJSON_Delete(root);
}

void response_handler_task(void *pvParameters) {
    // In a real system, this task might manage an audio queue
    // For now, handle_response is called directly from the websocket event
    while (1) {
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
}
