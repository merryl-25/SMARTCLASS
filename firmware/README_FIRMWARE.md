# ESP32 mmWave Radar SmartClass Firmware Flashing Guide

This directory contains the production-ready C++ firmware for the **SmartClass mmWave Intelligent Room Automation System**.

---

## 1. Required Hardware & Tools

1. **ESP32 NodeMCU Development Board** (ESP-WROOM-32 30-pin)
2. **HLK-LD2410 / HLK-LD2410C 24GHz FMCW Radar Module**
3. **2-Channel 5V Relay Module (Optocoupler Active-LOW Trigger)**:
   - **Channel 1**: Room Light Control
   - **Channel 2**: Room Fan Control (Direct Relay Actuation)
4. **12V DC Power Supply / Adapter** (To power the DC Fan motor through Relay Channel 2)
5. **Micro-USB Data Cable**
6. **Arduino IDE 2.x** (or PlatformIO VS Code extension)

*(Note: The L298N motor driver module, LDR Lux Sensor, and DHT22 Climate Sensor have been eliminated. Both Light and Fan operate strictly, cleanly, and reliably via direct 2-channel relay switching driven by mmWave radar presence detection).*

---

## 2. Arduino IDE Setup Instructions

### Step A: Install ESP32 Board Support
1. Open Arduino IDE -> `File` -> `Preferences`.
2. Add the following URL to **Additional Boards Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to `Tools` -> `Board` -> `Boards Manager...`, search for **esp32** by Espressif Systems and click **Install**.

### Step B: Required Libraries
- **No external libraries needed!** The firmware uses native ESP32 HardwareSerial and core libraries included with the ESP32 board package.

---

## 3. Direct Circuit Wiring Matrix

| Component | Pin Label | ESP32 / Power Pin | Function |
| :--- | :--- | :--- | :--- |
| **HLK-LD2410** | TX | **GPIO 16 (RX2)** | Radar Target Telemetry Input |
| **HLK-LD2410** | RX | **GPIO 17 (TX2)** | Sensor Config Commands |
| **HLK-LD2410** | OUT | **GPIO 15** | Instant Hardware Presence Fallback |
| **HLK-LD2410** | VCC / GND | **5V / GND** | Sensor Power Supply |
| **2-Ch Relay** | VCC / GND | **5V / GND** | Relay Optocoupler / Coil Power |
| **2-Ch Relay** | IN1 (Light) | **GPIO 26** | Relay Channel 1 Trigger (Active-LOW: 0V ON, 3.3V OFF) |
| **2-Ch Relay** | IN2 (Fan) | **GPIO 27** | Relay Channel 2 Trigger (Active-LOW: 0V ON, 3.3V OFF) |
| **Manual Switch** | Push-Button | **GPIO 4 & GND** | Hardware Manual Override (Internal PULLUP) |

### Fan & Light Appliance Power Connections (Relay Terminals)
- **Room Light**: 
  - AC Live (or DC +) $\rightarrow$ Relay 1 **COM1**
  - Relay 1 **NO1** (Normally Open) $\rightarrow$ Light Bulb (+)
  - Light Bulb (-) $\rightarrow$ Neutral (or DC -)
- **Room Fan**:
  - External 12V Power (+) $\rightarrow$ Relay 2 **COM2**
  - Relay 2 **NO2** (Normally Open) $\rightarrow$ Fan Red Wire (+)
  - External 12V Power (-) $\rightarrow$ Fan Black Wire (-)

---

## 4. Flashing Code to ESP32

1. Connect your ESP32 board to your computer via USB cable.
2. Select Board: `Tools` -> `Board` -> `esp32` -> `ESP32 Dev Module`.
3. Select COM Port: `Tools` -> `Port` -> Select your ESP32 COM Port (e.g. COM3 / COM4 / /dev/ttyUSB0).
4. Click **Upload** (Right arrow button).
5. Open Serial Monitor at **115200 Baud** to verify the clean initialization log and live telemetry stream:
   ```
   SmartClass ESP32 mmWave Radar System Online
   Pure Direct Relay Automation (Light & Fan)
   Motor Driver: REMOVED (Clean Presence Control)
   ```

---

## 5. Web Serial Integration

Once flashed, plug the ESP32 into Chrome or Edge browser, click **CONNECT ESP32 HARDWARE VIA USB** in the **Web Serial Gateway** tab of the SmartClass dashboard, and see physical sensor data streamed directly to your screen!
