#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"

extern void wifi_manager_task(void *pvParameters);
extern void ai_connection_task(void *pvParameters);
extern void input_handler_task(void *pvParameters);
extern void response_handler_task(void *pvParameters);

void app_main(void) {
    ESP_LOGI("MAIN", "Starting AI Assistant Firmware");

    xTaskCreate(&wifi_manager_task, "wifi_manager", 4096, NULL, 5, NULL);
    
    // Wait for WiFi to connect before starting AI client
    vTaskDelay(5000 / portTICK_PERIOD_MS);
    
    xTaskCreate(&ai_connection_task, "ai_connection", 8192, NULL, 4, NULL);
    xTaskCreate(&input_handler_task, "input_handler", 4096, NULL, 3, NULL);
    xTaskCreate(&response_handler_task, "response_handler", 4096, NULL, 3, NULL);
}
