# SmartClass: 24GHz mmWave Intelligent Classroom Automation System

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32--WROOM--32-E7352C?logo=espressif&logoColor=white)](https://www.espressif.com/)
[![Radar](https://img.shields.io/badge/Sensor-HLK--LD2410_24GHz_FMCW-00BCD4)](https://www.hlktech.net/)
[![Firebase](https://img.shields.io/badge/Database-Firebase_Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)

An IoT and Embedded AI classroom automation solution designed to eliminate passive electricity wastage in educational institutions. Using a **24GHz FMCW mmWave Radar sensor (HLK-LD2410)** and an **ESP32 microcontroller**, the system detects micro-motion (breathing, typing, reading) with zero false cutoffs, dynamically controlling lighting and ventilation relays while streaming real-time energy analytics to a web dashboard.

---

## 🌟 Key Features

- **24GHz FMCW Radar Sensing**: Micro-motion detection through table partitions and behind monitors without line-of-sight limitations (unlike conventional PIR sensors).
- **Configurable Vacant Hold Delay**: Selectable countdown timeouts (3s, 5s, 10s, 15s) ensuring appliances only de-energize once the room is genuinely unoccupied.
- **Direct 2-Channel Relay Actuation**: Dedicated Active-LOW drivers for Room Lighting (GPIO 26) and Ventilation/Fan (GPIO 27) with inductive snubbing.
- **Web Serial API Hardware Gateway**: Direct browser-to-ESP32 USB connection with zero driver installation, streaming telemetry at 5Hz.
- **Real-Time Energy Analytics**: Live hourly runtime tracking, dynamic load calculation (Watts), and institutional carbon offset ($CO_2$) reporting via Chart.js.
- **Rule Bypass & Manual Override**: 1-click master controls that lock relays to manual state with automated radar suppression grace periods.
- **Cloud Telemetry Persistence**: Background synchronization to Google Cloud Firestore with Super Admin authentication.

---

## 🔌 Hardware Pinout & Wiring

| Hardware Module | Module Pin | ESP32 GPIO Target | Signal Function |
| :--- | :--- | :--- | :--- |
| **HLK-LD2410 Radar** | **TX** | **GPIO 16 (RX2)** | UART Target Frame Stream (256000 / 115200 Baud) |
| **HLK-LD2410 Radar** | **RX** | **GPIO 17 (TX2)** | UART Gate & Sensitivity Commands |
| **HLK-LD2410 Radar** | **OUT** | **GPIO 15** | Hardware Presence Fallback |
| **HLK-LD2410 Radar** | **VCC / GND**| **5V (VIN) / GND** | 5V Power Rail (200mA peak) |
| **2-Ch Relay Module** | **IN1** | **GPIO 26** | Channel 1: Lighting Panel Relay (Active LOW) |
| **2-Ch Relay Module** | **IN2** | **GPIO 27** | Channel 2: Ventilation / Fan Relay (Active LOW) |
| **2-Ch Relay Module** | **VCC / GND**| **5V (VIN) / GND** | 5V Coil Power (**Do not connect to 3.3V**) |
| **Manual Push Switch**| **Pin 1 / 2** | **GPIO 4 & GND** | Physical Toggle Override (Internal Pull-Up) |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Arduino IDE** (with ESP32 board support installed)
- **Google Chrome** or **MS Edge** (required for Web Serial API support)

---

### 2. Frontend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/smartclass.git
   cd smartclass
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Firebase project credentials in `.env`.

4. **Launch the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### 3. ESP32 Firmware Upload

1. Open `firmware/smartclass_esp32_firmware/smartclass_esp32_firmware.ino` in **Arduino IDE**.
2. Select your board: **Tools $\rightarrow$ Board $\rightarrow$ ESP32 Arduino $\rightarrow$ ESP32 Dev Module**.
3. Select your COM Port under **Tools $\rightarrow$ Port**.
4. Click **Upload** (Hold the `BOOT` button on the ESP32 if upload does not start automatically).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Chart.js
- **Microcontroller**: ESP32-WROOM-32 (FreeRTOS Dual-Core 240MHz)
- **Firmware**: Arduino C/C++, Hardware UART2, Non-Blocking Frame Parser
- **Cloud & Database**: Google Firebase Authentication, Cloud Firestore
- **Hardware Bridge**: W3C Web Serial API (Direct Serial USB Streaming)

---

## 📄 License
This project is licensed under the MIT License.

