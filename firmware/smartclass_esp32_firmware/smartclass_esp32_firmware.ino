/*
 * =====================================================================================
 *  SmartClass: 24GHz mmWave Intelligent Room Automation System
 *  
 *  Hardware Components:
 *  - Microcontroller: ESP32-WROOM-32 (NodeMCU 30-pin)
 *  - Presence Sensor: HLK-LD2410 / LD2410C 24GHz FMCW Radar
 *                     - Radar TX  -> ESP32 GPIO 16 (RX2)
 *                     - Radar RX  -> ESP32 GPIO 17 (TX2)
 *                     - Radar OUT -> ESP32 GPIO 15 (Hardware Presence Fallback)
 *                     - Radar VCC -> ESP32 5V / VIN
 *                     - Radar GND -> ESP32 GND
 *  - 2-Channel 5V Relay Module (Direct Appliance Control - No Motor Driver):
 *                     - Channel 1 (Light): ESP32 GPIO 26 (Active LOW)
 *                     - Channel 2 (Fan):   ESP32 GPIO 27 (Active LOW)
 *                     - Relay VCC         -> ESP32 5V / VIN
 *                     - Relay GND         -> ESP32 GND
 *  - Manual Override Button: GPIO 4 & GND (Internal PULLUP)
 *  - Status Indicator:       ESP32 Onboard LED (GPIO 2)
 * =====================================================================================
 */

#include <Arduino.h>
#include <HardwareSerial.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// --- HARDWARE PIN DEFINITIONS ---
#define RADAR_RX_PIN      16   // Connects to LD2410 TX
#define RADAR_TX_PIN      17   // Connects to LD2410 RX
#define RADAR_OUT_PIN     15   // Connects to LD2410 OUT pin (instant hardware fallback)
#define STATUS_LED         2   // ESP32 Onboard Status LED
#define LIGHT_RELAY_PIN   26   // Channel 1 Relay (Room Light)
#define FAN_RELAY_PIN     27   // Channel 2 Relay (Room Fan - Direct Relay Control)
#define MANUAL_SWITCH_PIN  4   // Physical Manual Switch / Push-Button to GND (Internal PULLUP)

// Radar UART Baud Rate (HLK-LD2410 default 256000, LD2410C default 115200)
#define RADAR_BAUD_RATE   256000  

// --- AUTOMATION THRESHOLDS (SYNCED VIA WEB GATEWAY) ---
int MAX_SENSING_GATE    = 6;   // Gate 6 = 4.50 meters cutoff boundary (Gate * 0.75m)
int VACANT_HOLD_TIMEOUT = 5;   // Vacant hold delay in seconds (supports 3, 5, 10, 15)
int STATIC_SENSITIVITY  = 80;  // Static micro-motion sensitivity %
int MOTION_SENSITIVITY  = 70;  // Active motion sensitivity %

// --- HARDWARE OBJECTS ---
HardwareSerial RadarSerial(2); // Use ESP32 Hardware UART2

// --- SYSTEM STATE VARIABLES ---
bool presenceDetected   = false;
String motionType       = "none"; // "moving", "static", "moving + static", "none"
float targetDistance    = 0.0;
int staticEnergy        = 0;
int movingEnergy        = 0;

// Actuator States (Direct Relay Control)
bool lightRelayState    = false;
bool fanRelayState      = false;
bool manualOverride     = false;

unsigned long lastSeenTime       = 0;
unsigned long rawBytesReceived   = 0;
unsigned long currentBaud        = 256000;
unsigned long lastValidPacketTime= 0;
unsigned long lastBaudSwitchTime = 0;

// Non-blocking circular buffer for LD2410 UART streaming frames
static uint8_t radarRxBuf[128];
static int radarRxLen = 0;

// Forward declarations
void configureLd2410MaxGate(uint8_t gateNum, uint16_t timeoutSec);
void setRelayOutput(uint8_t pin, bool turnOn);
void sendTelemetryJson(bool forceImmediate = false);
int getVacantCountdownRemaining();
void processRadarFrames();
void evaluateAutomationRules();
void processPhysicalManualSwitch();
void processIncomingSerialCommands();

// --- HELPER: ROBUST RELAY ACTUATION (ACTIVE-LOW FIRM DRIVE) ---
void setRelayOutput(uint8_t pin, bool turnOn) {
  // Drive Active-LOW output without constantly re-invoking pinMode in tight loops
  digitalWrite(pin, turnOn ? LOW : HIGH);
}

void setup() {
  // Disable ESP32 Brownout Detector to prevent power surge resets
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  // Initialize USB Serial for Web Serial Gateway (115200 Baud)
  Serial.begin(115200);
  Serial.setTimeout(50); // Fast non-blocking timeout for JSON command streaming
  delay(500);

  // Initialize Relays as OUTPUT and firm OFF state (HIGH)
  pinMode(LIGHT_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  digitalWrite(LIGHT_RELAY_PIN, HIGH);
  digitalWrite(FAN_RELAY_PIN, HIGH);

  // Initialize Radar OUT Pin as digital input (High = Target Detected)
  pinMode(RADAR_OUT_PIN, INPUT_PULLDOWN);

  // Initialize LD2410 Radar UART2 (Default 256000, with auto-fallback to 115200)
  RadarSerial.begin(currentBaud, SERIAL_8N1, RADAR_RX_PIN, RADAR_TX_PIN);

  // Status LED
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  // Initialize Physical Manual Switch Push-Button (Active LOW with internal Pull-Up to 3.3V)
  pinMode(MANUAL_SWITCH_PIN, INPUT_PULLUP);

  Serial.println("=================================================");
  Serial.println("   SmartClass ESP32 mmWave Radar System Online   ");
  Serial.println("   Pure Direct Relay Automation (Light & Fan)    ");
  Serial.println("   Motor Driver: REMOVED (Clean Presence Control)");
  Serial.println("   Non-Blocking Radar Frame Engine & Auto-Baud   ");
  Serial.println("=================================================");

  // Synchronize LD2410 radar hardware max gate register (0s unmanned duration for immediate detection)
  configureLd2410MaxGate(MAX_SENSING_GATE, 0);
  lastBaudSwitchTime = millis();
}

// --- HELPER: CONFIGURE LD2410 RADAR SENSOR HARDWARE REGISTERS OVER UART ---
void configureLd2410MaxGate(uint8_t gateNum, uint16_t timeoutSec) {
  uint8_t gateVal = gateNum;
  if (gateVal < 2) gateVal = 2; // LD2410 minimum gate is 2 (1.50m)
  if (gateVal > 8) gateVal = 8; // LD2410 maximum gate is 8 (6.00m)
  
  // 1. Enter Configuration Mode: Command 0x00FF, Value 0x0001
  const uint8_t enableCfg[] = { 
    0xFD, 0xFC, 0xFB, 0xFA, 
    0x04, 0x00, 
    0xFF, 0x00, 
    0x01, 0x00, 
    0x04, 0x03, 0x02, 0x01 
  };
  RadarSerial.write(enableCfg, sizeof(enableCfg));
  delay(60);
  
  // 2. Set Max Distance Gate & Unmanned Duration: Command 0x0060 (Official Protocol)
  // Payload (20 bytes): Cmd(0x60, 0x00) + MovingGate(0x00, 0x00, 4B) + StaticGate(0x01, 0x00, 4B) + Unmanned(0x02, 0x00, 4B)
  uint8_t setGateCmd[] = {
    0xFD, 0xFC, 0xFB, 0xFA,       // Header
    0x14, 0x00,                   // Length: 20 bytes payload
    0x60, 0x00,                   // Command: 0x0060 Set Parameters
    0x00, 0x00,                   // Parameter 0: Max Moving Gate
    gateVal, 0x00, 0x00, 0x00,     // 4-byte Value
    0x01, 0x00,                   // Parameter 1: Max Static Gate
    gateVal, 0x00, 0x00, 0x00,     // 4-byte Value
    0x02, 0x00,                   // Parameter 2: Unmanned Duration
    (uint8_t)(timeoutSec & 0xFF), (uint8_t)((timeoutSec >> 8) & 0xFF), 0x00, 0x00, // 4-byte Value
    0x04, 0x03, 0x02, 0x01        // Tail
  };
  RadarSerial.write(setGateCmd, sizeof(setGateCmd));
  delay(60);
  
  // 3. Exit Configuration Mode: Command 0x00FE
  const uint8_t endCfg[] = { 
    0xFD, 0xFC, 0xFB, 0xFA, 
    0x02, 0x00, 
    0xFE, 0x00, 
    0x04, 0x03, 0x02, 0x01 
  };
  RadarSerial.write(endCfg, sizeof(endCfg));
  delay(60);
}

// --- HELPER: ROBUST STREAMING LD2410 RADAR UART PARSER (PURE DIRECT PRESENCE) ---
void processRadarFrames() {
  // 1. Read available UART bytes into accumulation buffer non-blockingly
  while (RadarSerial.available() > 0 && radarRxLen < (int)sizeof(radarRxBuf)) {
    radarRxBuf[radarRxLen++] = RadarSerial.read();
    rawBytesReceived++;
  }

  // 2. Scan for LD2410 Data Frame Header: 0xF4, 0xF3, 0xF2, 0xF1
  int headIdx = -1;
  for (int i = 0; i <= radarRxLen - 4; i++) {
    if (radarRxBuf[i] == 0xF4 && radarRxBuf[i+1] == 0xF3 && radarRxBuf[i+2] == 0xF2 && radarRxBuf[i+3] == 0xF1) {
      headIdx = i;
      break;
    }
  }

  // Discard any garbage bytes before frame header
  if (headIdx > 0) {
    memmove(radarRxBuf, &radarRxBuf[headIdx], radarRxLen - headIdx);
    radarRxLen -= headIdx;
    headIdx = 0;
  } else if (headIdx == -1 && radarRxLen >= 4) {
    // Retain last 3 bytes in case header arrived split across reads
    memmove(radarRxBuf, &radarRxBuf[radarRxLen - 3], 3);
    radarRxLen = 3;
  }

  // 3. Parse complete verified frame when full packet is available
  if (headIdx == 0 && radarRxLen >= 6) {
    uint16_t intraLen = radarRxBuf[4] | (radarRxBuf[5] << 8);
    int totalFrameLen = 4 + 2 + intraLen + 4; // Header(4) + Length(2) + Payload(intraLen) + Tail(4)

    if (totalFrameLen > (int)sizeof(radarRxBuf)) {
      // Corrupt length field, discard header byte to resync
      memmove(radarRxBuf, &radarRxBuf[1], radarRxLen - 1);
      radarRxLen--;
    } else if (radarRxLen >= totalFrameLen) {
      // Validate Frame Tail: 0xF8, 0xF7, 0xF6, 0xF5
      int tailIdx = 6 + intraLen;
      if (radarRxBuf[tailIdx]   == 0xF8 && 
          radarRxBuf[tailIdx+1] == 0xF7 && 
          radarRxBuf[tailIdx+2] == 0xF6 && 
          radarRxBuf[tailIdx+3] == 0xF5) {
        
        lastValidPacketTime = millis();
        uint8_t targetState = radarRxBuf[8]; // 0x00=Vacant, 0x01=Moving, 0x02=Static, 0x03=Both
        float maxAllowedDist = (float)MAX_SENSING_GATE * 0.75f;
        float currentTargetDist = 0.0f;
        int mEng = 0;
        int sEng = 0;
        String mType = "none";

        if (targetState == 0x01) {
          currentTargetDist = (radarRxBuf[9] | (radarRxBuf[10] << 8)) / 100.0f;
          mEng = radarRxBuf[11];
          mType = "moving";
        } else if (targetState == 0x02) {
          currentTargetDist = (radarRxBuf[12] | (radarRxBuf[13] << 8)) / 100.0f;
          sEng = radarRxBuf[14];
          mType = "static";
        } else if (targetState == 0x03) {
          float mDist = (radarRxBuf[9] | (radarRxBuf[10] << 8)) / 100.0f;
          float sDist = (radarRxBuf[12] | (radarRxBuf[13] << 8)) / 100.0f;
          currentTargetDist = (mDist > 0.05f) ? mDist : sDist;
          mEng = radarRxBuf[11];
          sEng = radarRxBuf[14];
          mType = "moving + static";
        }

        // Evaluate target distance against active radar maxGate cutoff boundary
        if (targetState != 0x00 && currentTargetDist > 0.05f && currentTargetDist <= maxAllowedDist) {
          presenceDetected = true;
          targetDistance   = currentTargetDist;
          motionType       = mType;
          movingEnergy     = mEng;
          staticEnergy     = sEng;
          lastSeenTime     = millis();
        } else if (targetState != 0x00 && currentTargetDist > maxAllowedDist) {
          // Target detected outside room boundaries (e.g. corridor outside door) -> Mark vacant
          targetDistance   = currentTargetDist;
          motionType       = "out of bounds";
          movingEnergy     = mEng;
          staticEnergy     = sEng;
          if (millis() - lastSeenTime > 500) {
            presenceDetected = false;
          }
        } else {
          // Explicit Vacant Frame from LD2410 Radar: no movement or static presence
          movingEnergy = 0;
          staticEnergy = 0;
          if (millis() - lastSeenTime > 400) {
            presenceDetected = false;
            motionType       = "none";
            targetDistance   = 0.0f;
          }
        }
      }

      // Remove processed frame from buffer
      memmove(radarRxBuf, &radarRxBuf[totalFrameLen], radarRxLen - totalFrameLen);
      radarRxLen -= totalFrameLen;
    }
  }

  // 4. Hardware OUT pin fallback ONLY if UART telemetry frames are offline
  bool uartStreaming = (millis() - lastValidPacketTime < 1500);
  if (!uartStreaming) {
    if (digitalRead(RADAR_OUT_PIN) == HIGH) {
      presenceDetected = true;
      lastSeenTime = millis();
      motionType = "detected";
    } else if (millis() - lastSeenTime > 800) {
      presenceDetected = false;
      motionType = "none";
      targetDistance = 0.0f;
    }
  }

  // 5. Automatic Baud Rate Detection (Toggles 256000 <-> 115200 until valid frames stream)
  if (millis() - lastValidPacketTime > 2500 && millis() - lastBaudSwitchTime > 2500) {
    lastBaudSwitchTime = millis();
    currentBaud = (currentBaud == 256000) ? 115200 : 256000;
    RadarSerial.begin(currentBaud, SERIAL_8N1, RADAR_RX_PIN, RADAR_TX_PIN);
    radarRxLen = 0;
    Serial.print("{\"event\":\"BAUD_SEARCH\",\"baud\":");
    Serial.print(currentBaud);
    Serial.println("}");
  }
}

// Global variable tracking last millisecond room was occupied
static unsigned long lastOccupiedTime = 0;

// Helper to calculate seconds remaining in vacant hold countdown
int getVacantCountdownRemaining() {
  if (manualOverride || presenceDetected) return 0;
  if (!lightRelayState && !fanRelayState) return 0;
  unsigned long holdMs = (unsigned long)(VACANT_HOLD_TIMEOUT * 1000);
  unsigned long elapsed = millis() - lastOccupiedTime;
  if (elapsed >= holdMs) return 0;
  return (int)((holdMs - elapsed + 999) / 1000);
}

// --- AUTOMATION ENGINE: PURE OCCUPANCY-DRIVEN RELAY CONTROL ---
void evaluateAutomationRules() {
  static bool prevLight = false;
  static bool prevFan   = false;
  static bool prevPres  = false;

  if (manualOverride) {
    // In manual override mode: relays directly obey user manual commands
    if (lightRelayState != prevLight || fanRelayState != prevFan) {
      setRelayOutput(LIGHT_RELAY_PIN, lightRelayState);
      setRelayOutput(FAN_RELAY_PIN,   fanRelayState);
      digitalWrite(STATUS_LED, (lightRelayState || fanRelayState) ? HIGH : LOW);
      prevLight = lightRelayState;
      prevFan   = fanRelayState;
      sendTelemetryJson(true);
    }
  } else {
    // Automated mmWave radar occupancy logic:
    // BOTH Light and Fan turn ON immediately upon presence!
    if (presenceDetected) {
      lastOccupiedTime = millis();
      lightRelayState = true;
      fanRelayState   = true;
    } else {
      // Room is vacant: enforce Vacant Hold Delay Timeout before de-energizing relays
      unsigned long holdMs = (unsigned long)(VACANT_HOLD_TIMEOUT * 1000);
      if (millis() - lastOccupiedTime >= holdMs) {
        lightRelayState = false;
        fanRelayState   = false;
      }
    }

    // Actuate physical Active-LOW Relays only upon state transition
    if (lightRelayState != prevLight || fanRelayState != prevFan || presenceDetected != prevPres) {
      setRelayOutput(LIGHT_RELAY_PIN, lightRelayState);
      setRelayOutput(FAN_RELAY_PIN,   fanRelayState);
      digitalWrite(STATUS_LED, presenceDetected ? HIGH : LOW);
      prevLight = lightRelayState;
      prevFan   = fanRelayState;
      prevPres  = presenceDetected;
      sendTelemetryJson(true);
    }
  }
}

// --- SEND JSON TELEMETRY PACKET OVER SERIAL GATEWAY ---
void sendTelemetryJson(bool forceImmediate) {
  static unsigned long lastReport = 0;
  if (forceImmediate || millis() - lastReport >= 200) { // Stream at 5Hz or immediate on state change
    lastReport = millis();

    int cd = getVacantCountdownRemaining();

    Serial.print("{\"presence\":");
    Serial.print(presenceDetected ? "true" : "false");
    Serial.print(",\"dist\":");
    Serial.print(targetDistance, 2);
    Serial.print(",\"motion\":\"");
    Serial.print(motionType);
    Serial.print("\",\"staticEng\":");
    Serial.print(staticEnergy);
    Serial.print(",\"movingEng\":");
    Serial.print(movingEnergy);
    Serial.print(",\"lightRelay\":");
    Serial.print(lightRelayState ? "true" : "false");
    Serial.print(",\"fanRelay\":");
    Serial.print(fanRelayState ? "true" : "false");
    Serial.print(",\"fanSpeed\":");
    Serial.print(fanRelayState ? 100 : 0);
    Serial.print(",\"manualOverride\":");
    Serial.print(manualOverride ? "true" : "false");
    Serial.print(",\"vacantTimeout\":");
    Serial.print(VACANT_HOLD_TIMEOUT);
    Serial.print(",\"vacantCountdown\":");
    if (cd > 0) {
      Serial.print(cd);
    } else {
      Serial.print("null");
    }
    Serial.println("}");
  }
}

// --- PROCESS PHYSICAL HARDWARE MANUAL OVERRIDE SWITCH / BUTTON ---
void processPhysicalManualSwitch() {
  static unsigned long lastBtnTime = 0;
  static int lastStableState = HIGH;
  static unsigned long pressStartTime = 0;

  int currentReading = digitalRead(MANUAL_SWITCH_PIN);

  if (currentReading == LOW) {
    if (pressStartTime == 0) {
      pressStartTime = millis();
    } else if (millis() - pressStartTime >= 60) {
      if (lastStableState == HIGH && millis() - lastBtnTime > 400) {
        lastBtnTime = millis();
        lastStableState = LOW;
        manualOverride = !manualOverride;
        if (manualOverride) {
          // Turning ON manual override: force ON both light and fan
          lightRelayState = true;
          fanRelayState   = true;
          setRelayOutput(LIGHT_RELAY_PIN, true);
          setRelayOutput(FAN_RELAY_PIN,   true);
          Serial.println("{\"event\":\"MANUAL_SWITCH_PHYSICAL_TRIGGER\",\"manualOverride\":true,\"lightRelay\":true,\"fanRelay\":true,\"fanSpeed\":100}");
        } else {
          Serial.println("{\"event\":\"MANUAL_SWITCH_PHYSICAL_TRIGGER\",\"manualOverride\":false}");
        }
        sendTelemetryJson(true);
      }
    }
  } else {
    pressStartTime = 0;
    lastStableState = HIGH;
  }
}

// --- PROCESS INCOMING COMMANDS FROM WEB GATEWAY ---
void processIncomingSerialCommands() {
  if (Serial.available() > 0) {
    String inputStr = Serial.readStringUntil('\n');
    inputStr.trim();
    if (inputStr.startsWith("{") && inputStr.endsWith("}")) {
      
      // 1. Manual Override Toggle
      if (inputStr.indexOf("\"manualOverride\":true") != -1 || inputStr.indexOf("\"manualOverride\": true") != -1) {
        manualOverride = true;
      } else if (inputStr.indexOf("\"manualOverride\":false") != -1 || inputStr.indexOf("\"manualOverride\": false") != -1) {
        manualOverride = false;
      }

      // 2. Light Relay State
      if (inputStr.indexOf("\"lightRelay\":true") != -1 || inputStr.indexOf("\"lightRelay\": true") != -1) {
        lightRelayState = true;
      } else if (inputStr.indexOf("\"lightRelay\":false") != -1 || inputStr.indexOf("\"lightRelay\": false") != -1) {
        lightRelayState = false;
      }

      // 3. Fan Relay State
      if (inputStr.indexOf("\"fanRelay\":true") != -1 || inputStr.indexOf("\"fanRelay\": true") != -1) {
        fanRelayState = true;
      } else if (inputStr.indexOf("\"fanRelay\":false") != -1 || inputStr.indexOf("\"fanRelay\": false") != -1) {
        fanRelayState = false;
      }

      // Fan Speed compatibility: fanSpeed > 0 turns on fan, fanSpeed == 0 turns off
      int fanIdx = inputStr.indexOf("\"fanSpeed\":");
      if (fanIdx != -1) {
        int startPos = fanIdx + 11;
        while (startPos < inputStr.length() && (inputStr.charAt(startPos) == ' ' || inputStr.charAt(startPos) == ':')) startPos++;
        int val = inputStr.substring(startPos).toInt();
        fanRelayState = (val > 0);
      }

      // Immediately actuate physical relays if manual override is engaged
      if (manualOverride) {
        setRelayOutput(LIGHT_RELAY_PIN, lightRelayState);
        setRelayOutput(FAN_RELAY_PIN,   fanRelayState);
        digitalWrite(STATUS_LED, (lightRelayState || fanRelayState) ? HIGH : LOW);
        sendTelemetryJson(true);
      }

      // 4. Max Gate Register (G1 to G8)
      int gateIdx = inputStr.indexOf("\"maxGate\":");
      if (gateIdx != -1) {
        int startPos = gateIdx + 10;
        while (startPos < inputStr.length() && (inputStr.charAt(startPos) == ' ' || inputStr.charAt(startPos) == ':')) startPos++;
        int val = inputStr.substring(startPos).toInt();
        if (val >= 1 && val <= 8) {
          MAX_SENSING_GATE = val;
          configureLd2410MaxGate(MAX_SENSING_GATE, 0);
        }
      }

      // 5. Vacant Hold Delay Timeout (3, 5, 10, 15 seconds)
      int timeoutIdx = inputStr.indexOf("\"vacantTimeout\":");
      if (timeoutIdx != -1) {
        int startPos = timeoutIdx + 16;
        while (startPos < inputStr.length() && (inputStr.charAt(startPos) == ' ' || inputStr.charAt(startPos) == ':')) startPos++;
        int val = inputStr.substring(startPos).toInt();
        if (val > 0 && val <= 300) {
          VACANT_HOLD_TIMEOUT = val;
          sendTelemetryJson(true);
        }
      }

      // 6. Sensitivities
      int ssensIdx = inputStr.indexOf("\"staticSens\":");
      if (ssensIdx != -1) {
        int val = inputStr.substring(ssensIdx + 13).toInt();
        if (val > 0) STATIC_SENSITIVITY = val;
      }
      int msensIdx = inputStr.indexOf("\"motionSens\":");
      if (msensIdx != -1) {
        int val = inputStr.substring(msensIdx + 13).toInt();
        if (val > 0) MOTION_SENSITIVITY = val;
      }
    }
  }
}

void loop() {
  // 1. Process Physical Push-Button / Manual Switch (GPIO 4)
  processPhysicalManualSwitch();

  // 2. Process Incoming Commands from Web Dashboard
  processIncomingSerialCommands();

  // 3. Read mmWave Radar & Apply Pure Presence Detection
  processRadarFrames();

  // 4. Evaluate Automation or Manual Override Rules (Direct Relay Drive)
  evaluateAutomationRules();

  // 5. Send Live Telemetry Packet (5Hz)
  sendTelemetryJson();
}
