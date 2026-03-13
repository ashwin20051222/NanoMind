#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include <string.h>

static const char *TAG = "input_handler";

extern void ai_send_query(const char* query);

void input_handler_task(void *pvParameters) {
    ESP_LOGI(TAG, "Input handler started. Simulating input every 30 seconds.");
    
    while (1) {
        vTaskDelay(30000 / portTICK_PERIOD_MS);
        ESP_LOGI(TAG, "Triggering simulated query...");
        ai_send_query("What is the weather like today?");
    }
}
