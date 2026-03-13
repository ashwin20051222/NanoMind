# Firmware Build Instructions

1. Install ESP-IDF (v5.0+ recommended).
2. Navigate to `firmware/`.
3. Run `idf.py set-target esp32s3`.
4. Run `idf.py menuconfig` to configure any specific hardware settings.
5. Run `idf.py build`.
6. Run `idf.py -p /dev/ttyUSB0 flash monitor` to flash the device and view logs.
