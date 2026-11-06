# SmartClass mmWave Automation System - UML Documentation

This document contains the complete **UML 2.5 Software and Hardware Specification** for the SmartClass mmWave Intelligent Automation System.

---

## 1. UML Use Case Diagram

```mermaid
flowchart TD
    %% Top Primary Actors
    subgraph HumanActors ["👥 Primary System Actors"]
        direction LR
        NormalUser["👤 Authorized / Normal User"]
        SuperAdmin["🛡️ Classroom Administrator"]
        SuperAdmin -->|Inherits Access| NormalUser
    end

    %% Vertical System Boundary
    subgraph SystemBoundary ["🏫 SmartClass Automation System (System Boundary)"]
        direction TB

        subgraph Sec1 ["🔐 1. Authentication & Role Security"]
            direction TB
            UC1(["UC-01: Authenticate via Super Admin Portal"])
            UC2(["UC-02: Authorize / Provision New Administrator"])
            UC1 ~~~ UC2
        end

        subgraph Sec2 ["📊 2. Live Monitoring & Serial Gateway"]
            direction TB
            UC3(["UC-03: View Live Presence & Status Telemetry"])
            UC4(["UC-04: View 24GHz FMCW Radar Polar Blips"])
            UC5(["UC-05: Connect Web Serial USB Gateway (115.2k)"])
            UC3 ~~~ UC4 ~~~ UC5
        end

        subgraph Sec3 ["⚡ 3. Control, Calibration & Analytics"]
            direction TB
            UC6(["UC-06: Manual Appliance Override (Light & Fan)"])
            UC7(["UC-07: Configure Range Gates (G1-G8) & Delays"])
            UC8(["UC-08: View Energy Analytics & Audit Logs"])
            UC6 ~~~ UC7 ~~~ UC8
        end

        subgraph Sec4 ["🎯 4. Embedded Edge Processing (ESP32)"]
            direction TB
            UC9(["UC-09: Sample HLK-LD2410 Radar (UART2 256k)"])
            UC10(["UC-10: Drive Relays via Tri-State High-Z Logic"])
            UC11(["UC-11: Stream JSON Telemetry Packet at 5Hz"])
            UC9 ~~~ UC10 ~~~ UC11
        end

        %% Invisible links enforcing vertical order
        Sec1 ~~~ Sec2
        Sec2 ~~~ Sec3
        Sec3 ~~~ Sec4
    end

    %% Secondary Actors at Bottom
    subgraph SystemActors ["⚡ External Edge & Cloud Systems"]
        direction LR
        ESP32["⚡ ESP32 Microcontroller"]
        FirebaseCloud["☁️ Firebase Cloud Platform"]
    end

    %% Actor Associations
    NormalUser --> UC3
    NormalUser --> UC4
    NormalUser --> UC5

    SuperAdmin --> UC1
    SuperAdmin --> UC2
    SuperAdmin --> UC6
    SuperAdmin --> UC7
    SuperAdmin --> UC8

    %% Cloud Associations
    UC1 -.->|Verify Admin| FirebaseCloud
    UC2 -.->|admin_users DB| FirebaseCloud

    %% Hardware Associations
    ESP32 --> UC9
    ESP32 --> UC10
    ESP32 --> UC11

    UC6 -.->|Serial Command| UC10
    UC11 -.->|Telemetry Packet| UC3
```

---

## 2. UML Class Diagram

```mermaid
classDiagram
    class App {
        +string activeTab
        +boolean isSimulating
        +User currentUser
        +boolean isSuperAdmin
        +boolean presenceDetected
        +number targetDistance
        +string motionType
        +number staticEnergy
        +number movingEnergy
        +number[] gateEnergies
        +number ambientLux
        +number roomTemp
        +boolean lightRelay
        +number fanSpeed
        +boolean manualOverride
        +number maxGate
        +number occupancyTimeout
        +number vacantCountdown
        +object todayUsage
        +handleIncomingData(object data) void
        +handleToggleLight(boolean state) void
        +handleToggleFan(boolean state) void
        +handleManualAllOn() void
        +handleManualAllOff() void
        +handleResumeAuto() void
        +sendSerialCommand(object cmd) void
    }

    class Header {
        +string activeTab
        +User currentUser
        +boolean isSuperAdmin
        +boolean presenceDetected
        +boolean lightRelay
        +number fanSpeed
        +setActiveTab(string id) void
        +renderRoleBadge() JSX
        +renderNavTabs() JSX
    }

    class RadarCanvas {
        +boolean presenceDetected
        +number targetDistance
        +string motionType
        +number maxGate
        +number[] gateEnergies
        +drawRadarGrid(CanvasRenderingContext2D ctx) void
        +drawGateArcs(CanvasRenderingContext2D ctx) void
        +drawHysteresisMargin(CanvasRenderingContext2D ctx) void
        +renderBlips(CanvasRenderingContext2D ctx) void
    }

    class AutomationEngine {
        +number maxGate
        +number occupancyTimeout
        +number staticSens
        +number motionSens
        +number tempMin
        +number tempMax
        +boolean lightRelay
        +number fanSpeed
        +boolean manualOverride
        +handleSaveConfig() void
        +handleToggleLight(boolean nextState) void
        +handleToggleFan(boolean nextState) void
        +sendSerialCommand(object payload) void
    }

    class EnergyAnalytics {
        +boolean lightRelay
        +number fanSpeed
        +boolean presenceDetected
        +object todayUsage
        +calculateHourlyKwh() number[]
        +calculateCostSavings() number
        +calculateCO2Reduction() number
        +renderHourlyBarChart() JSX
    }

    class SerialGateway {
        +SerialPort activePort
        +ReadableStream reader
        +WritableStream writer
        +boolean isConnected
        +number baudRate
        +connectSerialPort() Promise~void~
        +disconnectSerialPort() Promise~void~
        +startStreamReading() Promise~void~
        +writeSerialCommand(string json) Promise~void~
    }

    class AdminLogin {
        +User currentUser
        +AdminAccount[] authorizedAdmins
        +string loginEmail
        +string loginPassword
        +boolean isSuperAdmin
        +handleLoginSubmit(Event e) Promise~void~
        +handleDemoAdminLogin() void
        +handleAddNewAdmin(Event e) Promise~void~
        +handleDeleteAdmin(string id) void
        +handleLogout() Promise~void~
    }

    class FirebaseService {
        +Auth auth
        +Firestore db
        +loginAdmin(string email, string password) Promise~User~
        +registerAdmin(string email, string password) Promise~User~
        +syncLiveClassroomState(string roomId, Object state) Promise~boolean~
        +syncDailyEnergyLog(string roomId, string date, Object usage, Object metrics) Promise~boolean~
        +recordLoginAuditLog(User user, string method) Promise~boolean~
        +fetchRecentLoginLogs(number limit) Promise~Array~
        +logoutAdmin() Promise~void~
    }

    class User {
        +string uid
        +string email
        +string displayName
        +string role
        +boolean isDefault
    }

    class ESP32Firmware {
        +uint8_t LIGHT_RELAY_PIN = 26
        +uint8_t FAN_RELAY_PIN = 27
        +uint8_t STATUS_LED = 2
        +uint8_t MANUAL_SWITCH_PIN = 4
        +uint8_t RADAR_OUT_PIN = 15
        +boolean lightRelayState
        +int fanSpeedPwm
        +boolean manualOverride
        +boolean presenceDetected
        +float targetDistance
        +setup() void
        +loop() void
        +setRelayOutput(uint8_t pin, boolean turnOn) void
        +evaluateAutomationRules() void
        +processPhysicalManualSwitch() void
        +processIncomingSerialCommands() void
        +sendTelemetryJson(boolean forceImmediate) void
    }

    class LD2410RadarDriver {
        +HardwareSerial RadarSerial
        +uint32_t RADAR_BAUD_RATE = 256000
        +int MAX_SENSING_GATE = 6
        +configureLd2410MaxGate(uint8_t gate, uint16_t timeout) void
        +processRadarFrames() void
        +parseTargetPayload(uint8_t[] buffer) void
    }

    App *-- Header
    App *-- RadarCanvas
    App *-- AutomationEngine
    App *-- EnergyAnalytics
    App *-- SerialGateway
    App *-- AdminLogin
    App o-- User

    AdminLogin ..> FirebaseService : Authenticates
    AdminLogin o-- User : Manages

    SerialGateway <--> ESP32Firmware : Web Serial USB CDC (115200 Baud)
    ESP32Firmware *-- LD2410RadarDriver : UART2 Interface
```

---

## 3. High-Level Component & Architecture Diagram

```mermaid
graph TB
    subgraph Physical_Hardware ["Classroom Hardware Edge"]
        RadarSensor["HLK-LD2410 mmWave Sensor<br/>(24GHz FMCW Radar)"]
        ESP32["ESP32 Microcontroller<br/>(NodeMCU 240MHz)"]
        RelayBoard["2-Channel 5V Relay Module<br/>(Optocoupler Isolated)"]
        LightActuator["Classroom Lighting Relay<br/>(GPIO 26 - Tri-State)"]
        FanActuator["Classroom Fan Relay<br/>(GPIO 27 - Tri-State)"]
        OnboardLED["ESP32 Onboard LED (GPIO 2)<br/>(Dedicated Light Status)"]
        PhysicalSwitch["Manual Push Button<br/>(GPIO 4 - 60ms Filter)"]

        RadarSensor -->|UART2 256000 Baud| ESP32
        ESP32 -->|Tri-State Active-LOW| RelayBoard
        RelayBoard --> LightActuator
        RelayBoard --> FanActuator
        ESP32 --> OnboardLED
        PhysicalSwitch -->|Active-LOW Hold| ESP32
    end

    subgraph Browser_Client ["React Web Client (Vite Application)"]
        WebSerial["Web Serial API Driver<br/>(115200 Baud Stream)"]
        AppController["App Component<br/>(Master State & Rule Coordinator)"]
        LiveRadarUI["RadarCanvas Visualizer<br/>(Polar Radar & 8-Gate Energy)"]
        TelemetryUI["Telemetry Cards<br/>(Occupancy, Lux, Temp, Status)"]
        AutomationUI["Automation Engine<br/>(Calibration & Manual Override)"]
        EnergyUI["Energy Analytics<br/>(Live 294W vs Baseline Hourly)"]
        AdminAuthUI["Admin Security Portal<br/>(Role Guard & Add Admin Console)"]

        WebSerial <--> AppController
        AppController --> LiveRadarUI
        AppController --> TelemetryUI
        AppController --> AutomationUI
        AppController --> EnergyUI
        AppController --> AdminAuthUI
    end

    subgraph Cloud_Infrastructure ["Google Firebase Cloud"]
        FirebaseAuth["Firebase Authentication<br/>(Identity Management)"]
        FirestoreDB["Cloud Firestore Database<br/>(admin_users & login_logs)"]
    end

    ESP32 <==>|USB CDC Serial Protocol<br/>JSON Bidirectional @ 5Hz| WebSerial
    AdminAuthUI <==>|HTTPS REST / SDK| FirebaseAuth
    AdminAuthUI <==>|Document CRUD / SDK| FirestoreDB
```

---

## 4. UML Sequence Diagram: Independent Light Toggle (Fan Running)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant UI as React UI (AutomationEngine)
    participant App as App.jsx State Manager
    participant Serial as Web Serial Driver
    participant ESP as ESP32 Firmware
    participant Relay as 2-Channel Relay Board

    Note over User, Relay: Fan is currently ON (fanSpeed = 75, Relay 2 energized)
    User->>UI: Toggle Light switch to OFF
    UI->>App: handleToggleLight(false)
    App->>App: setLightRelay(false)
    App->>App: ignoreTelemetryRelayUntil = Date.now() + 1500ms
    App->>Serial: sendSerialCommand({ manualOverride: true, lightRelay: false, fanSpeed: 75 })
    Serial->>ESP: JSON Stream: {"manualOverride":true,"lightRelay":false,"fanSpeed":75}\n
    
    ESP->>ESP: processIncomingSerialCommands() parses payload
    ESP->>ESP: lightRelayState = false, fanSpeedPwm = 75
    
    rect rgb(16, 185, 129, 0.1)
    Note over ESP, Relay: Tri-State Relay Actuation: Pin set to INPUT (High-Z)
    ESP->>Relay: pinMode(GPIO 26, INPUT) [Leakage = 0.0mA]
    Relay-->>Relay: Optocoupler 1 completely starves & de-energizes
    Relay->>Relay: Light turns OFF reliably despite Fan coil load!
    end

    ESP->>ESP: digitalWrite(STATUS_LED, LOW) [Onboard LED OFF]
    ESP->>Serial: sendTelemetryJson(forceImmediate=true)
    Serial->>App: Packet: {"presence":true,"lightRelay":false,"fanSpeed":75}
    App->>UI: Updates and confirms Light = OFF, Fan = 75%
```
