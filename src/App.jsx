import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import Header from './components/Header';
import TelemetryCards from './components/TelemetryCards';
import RadarCanvas from './components/RadarCanvas';
import SimulatorControl from './components/SimulatorControl';
import ClassroomMap from './components/ClassroomMap';
import AutomationEngine from './components/AutomationEngine';
import EnergyAnalytics from './components/EnergyAnalytics';
import HardwareSchematics from './components/HardwareSchematics';
import SerialGateway from './components/SerialGateway';
import AdminLogin from './components/AdminLogin';
import { 
  auth, 
  onAuthStateChanged, 
  syncLiveClassroomState, 
  syncDailyEnergyLog 
} from './config/firebase';

const DEFAULT_NORMAL_USER = {
  role: 'user',
  displayName: 'Normal User',
  email: 'viewer@smartclass.edu',
  isDefault: true
};

function RestrictedModuleBarrier({ moduleName, setActiveTab }) {
  return (
    <div className="glass-panel p-8 text-center max-w-lg mx-auto my-12 border-amber-500/30 space-y-4 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
        <Lock className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-white font-['Outfit']">Super Admin Access Required</h3>
      <p className="text-xs text-slate-400 leading-relaxed">
        The <strong className="text-slate-200">{moduleName}</strong> module is protected. By default, Normal Users have access to <strong>Live Control & Radar</strong>. Please authenticate as a Super Administrator to unlock this module.
      </p>
      <button
        onClick={() => setActiveTab('admin')}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
      >
        <span>Open Super Admin Portal</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulating, setIsSimulating] = useState(true);

  // Default to Normal User; restore Super Admin session only if previously authenticated
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smartclass_super_admin');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role === 'super_admin') {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_NORMAL_USER;
  });

  const isSuperAdmin = currentUser && currentUser.role === 'super_admin';

  // Subscribe to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const adminSession = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Super Administrator',
          role: 'super_admin',
          isDemo: false
        };
        setCurrentUser(adminSession);
        localStorage.setItem('smartclass_super_admin', JSON.stringify(adminSession));
      }
    });
    return () => unsubscribe();
  }, []);

  // Global Telemetry States
  const [presenceDetected, setPresenceDetected] = useState(true);
  const [targetDistance, setTargetDistance] = useState(2.15);
  const [motionType, setMotionType] = useState('moving'); // 'moving', 'static', 'none'
  const [staticEnergy, setStaticEnergy] = useState(45);
  const [movingEnergy, setMovingEnergy] = useState(80);
  const [gateEnergies, setGateEnergies] = useState([10, 30, 80, 45, 15, 5, 0, 0]);

  // Environment & Calibration States
  const [ambientLux, setAmbientLux] = useState(140);
  const [roomTemp, setRoomTemp] = useState(29);
  const [lightThreshold, setLightThreshold] = useState(200);
  const [occupancyTimeout, setOccupancyTimeout] = useState(5); // 3, 5, 10, 15 seconds
  const [vacantCountdown, setVacantCountdown] = useState(null); // active seconds remaining or null
  const [tempMin, setTempMin] = useState(25);
  const [tempMax, setTempMax] = useState(34);
  const [maxGate, setMaxGate] = useState(6);
  const [staticSens, setStaticSens] = useState(80);
  const [motionSens, setMotionSens] = useState(70);

  // Appliance Actuator States (Direct Relay Control - No Motor Driver)
  const [lightRelay, setLightRelay] = useState(true);
  const [fanSpeed, setFanSpeed] = useState(100); // 100 = Relay ON, 0 = Relay OFF
  const [manualOverride, setManualOverride] = useState(false);

  // Refs to always hold the latest states and avoid stale closures in serial callbacks
  const manualOverrideRef = useRef(manualOverride);
  const lightRelayRef = useRef(lightRelay);
  const fanSpeedRef = useRef(fanSpeed);
  const presenceDetectedRef = useRef(presenceDetected);
  const ignoreTelemetryRelayUntilRef = useRef(0);
  const ignoreTelemetryTempUntilRef = useRef(0);

  useEffect(() => {
    manualOverrideRef.current = manualOverride;
  }, [manualOverride]);

  useEffect(() => {
    lightRelayRef.current = lightRelay;
  }, [lightRelay]);

  useEffect(() => {
    fanSpeedRef.current = fanSpeed;
  }, [fanSpeed]);

  useEffect(() => {
    presenceDetectedRef.current = presenceDetected;
  }, [presenceDetected]);

  // Today's Live Sensor & Appliance Runtime Tracker (Persisted in localStorage)
  const [todayUsage, setTodayUsage] = useState(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(`smartclass_usage_${today}`);
      return saved ? JSON.parse(saved) : { activeSec: 0, vacantSec: 0, hourly: {} };
    } catch (e) {
      return { activeSec: 0, vacantSec: 0, hourly: {} };
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const currentHour = now.getHours();
      const key = `smartclass_usage_${today}`;

      // CRITICAL: Time is recorded and timer increments ONLY when the sensor is actually ON (detects presence)
      const isSensorOn = presenceDetectedRef.current === true;

      setTodayUsage((prev) => {
        const prevActive = prev?.activeSec || 0;
        const prevVacant = prev?.vacantSec || 0;
        const hourly = { ...(prev?.hourly || {}) };
        const hourData = hourly[currentHour] || { activeSec: 0, vacantSec: 0 };

        hourly[currentHour] = {
          activeSec: isSensorOn ? (hourData.activeSec || 0) + 1 : (hourData.activeSec || 0),
          vacantSec: !isSensorOn ? (hourData.vacantSec || 0) + 1 : (hourData.vacantSec || 0),
        };

        const updated = {
          activeSec: isSensorOn ? prevActive + 1 : prevActive,
          vacantSec: !isSensorOn ? prevVacant + 1 : prevVacant,
          hourly,
        };

        try {
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (e) {}

        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // --- FIREBASE CLOUD REAL-TIME SYNC ---
  const [cloudSyncInfo, setCloudSyncInfo] = useState({
    active: true,
    lastTelemetrySync: null,
    lastEnergySync: null
  });

  // 1. Live Sensor Telemetry & Classroom Actuator State Sync (Firestore: 'classrooms')
  useEffect(() => {
    let isMounted = true;
    const syncTelemetry = async () => {
      try {
        const ok = await syncLiveClassroomState('CR-101', {
          presenceDetected,
          motionType,
          targetDistance,
          ambientLux,
          roomTemp,
          lightRelay,
          fanSpeed,
          manualOverride,
          vacantCountdown,
          isSimulating
        });
        if (ok && isMounted) {
          setCloudSyncInfo((prev) => ({ ...prev, lastTelemetrySync: new Date().toLocaleTimeString() }));
        }
      } catch (err) {
        console.warn('Firebase telemetry sync notice:', err);
      }
    };

    // Immediate sync on critical state changes
    syncTelemetry();

    // Periodic heartbeat sync every 8 seconds
    const interval = setInterval(syncTelemetry, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [presenceDetected, motionType, targetDistance, ambientLux, roomTemp, lightRelay, fanSpeed, manualOverride, vacantCountdown, isSimulating]);

  const todayUsageRef = useRef(todayUsage);
  useEffect(() => {
    todayUsageRef.current = todayUsage;
  }, [todayUsage]);

  // 2. Daily Energy Consumption & Savings Log Sync (Firestore: 'energy_logs')
  useEffect(() => {
    let isMounted = true;
    const totalNominalWatts = 294; // 144W Lights + 150W Fans
    const syncEnergy = async () => {
      try {
        const usage = todayUsageRef.current;
        const today = new Date().toISOString().slice(0, 10);
        const activeSec = usage?.activeSec || 0;
        const vacantSec = usage?.vacantSec || 0;
        const todayWhConsumed = (activeSec * totalNominalWatts) / 3600;
        const todayWhSaved = (vacantSec * totalNominalWatts) / 3600;
        const kwhSaved = todayWhSaved / 1000;
        const costSavedINR = kwhSaved * 8.0; // ₹8.00 / kWh
        const co2ReducedKg = kwhSaved * 0.82; // 0.82 kg CO2 / kWh

        const ok = await syncDailyEnergyLog('CR-101', today, usage, {
          todayWhConsumed: Math.round(todayWhConsumed * 100) / 100,
          todayWhSaved: Math.round(todayWhSaved * 100) / 100,
          costSavedINR: Math.round(costSavedINR * 100) / 100,
          co2ReducedKg: Math.round(co2ReducedKg * 100) / 100
        });

        if (ok && isMounted) {
          setCloudSyncInfo((prev) => ({ ...prev, lastEnergySync: new Date().toLocaleTimeString() }));
        }
      } catch (err) {
        console.warn('Firebase energy log sync notice:', err);
      }
    };

    // Immediate sync on load
    syncEnergy();

    // Periodic sync every 20 seconds
    const interval = setInterval(syncEnergy, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Helper to safely write serial commands to ESP32 Web Serial stream
  const sendSerialCommand = (obj) => {
    if (window.esp32SerialWriter) {
      try {
        const payload = JSON.stringify(obj) + '\n';
        window.esp32SerialWriter.write(payload);
        console.log('[SERIAL TX]', payload);
      } catch (e) {
        console.warn('Serial write error:', e);
      }
    }
  };

  // Update simulated / monitored room temperature
  const handleSetRoomTemp = (val) => {
    const newTemp = Math.max(10, Math.min(50, parseFloat(val) || 25));
    setRoomTemp(newTemp);
    ignoreTelemetryTempUntilRef.current = Date.now() + 3000;
  };

  // Change Vacant Hold Delay Timeout (3, 5, 10, 15s) and sync to ESP32
  const handleVacantTimeoutChange = (sec) => {
    const val = Math.max(1, parseInt(sec) || 5);
    setOccupancyTimeout(val);
    if (!presenceDetected && (lightRelay || fanSpeed > 0)) {
      setVacantCountdown(val);
    }
    sendSerialCommand({ vacantTimeout: val });
  };

  // Master Manual Switch Controls (Centralized)
  const handleManualAllOn = () => {
    setManualOverride(true);
    manualOverrideRef.current = true;
    setLightRelay(true);
    lightRelayRef.current = true;
    setFanSpeed(100);
    fanSpeedRef.current = 100;
    setVacantCountdown(null);
    ignoreTelemetryRelayUntilRef.current = Date.now() + 1500;
    sendSerialCommand({ manualOverride: true, lightRelay: true, fanRelay: true, fanSpeed: 100 });
  };

  const handleManualAllOff = () => {
    setManualOverride(true);
    manualOverrideRef.current = true;
    setLightRelay(false);
    lightRelayRef.current = false;
    setFanSpeed(0);
    fanSpeedRef.current = 0;
    setVacantCountdown(null);
    ignoreTelemetryRelayUntilRef.current = Date.now() + 1500;
    sendSerialCommand({ manualOverride: true, lightRelay: false, fanRelay: false, fanSpeed: 0 });
  };

  const handleResumeAuto = () => {
    setManualOverride(false);
    manualOverrideRef.current = false;
    ignoreTelemetryRelayUntilRef.current = Date.now() + 2500;
    sendSerialCommand({ manualOverride: false });
  };

  const handleToggleManualOverride = (checked) => {
    setManualOverride(checked);
    manualOverrideRef.current = checked;
    ignoreTelemetryRelayUntilRef.current = Date.now() + 2500;
    sendSerialCommand({
      manualOverride: checked,
      lightRelay: lightRelayRef.current,
      fanRelay: fanSpeedRef.current > 0,
      fanSpeed: fanSpeedRef.current
    });
  };

  const handleToggleLight = (nextState) => {
    setManualOverride(true);
    manualOverrideRef.current = true;
    setLightRelay(nextState);
    lightRelayRef.current = nextState;
    ignoreTelemetryRelayUntilRef.current = Date.now() + 2500;
    sendSerialCommand({ manualOverride: true, lightRelay: nextState, fanRelay: fanSpeedRef.current > 0, fanSpeed: fanSpeedRef.current });
  };

  const handleToggleFan = (nextState) => {
    setManualOverride(true);
    manualOverrideRef.current = true;
    const speed = nextState ? 100 : 0;
    setFanSpeed(speed);
    fanSpeedRef.current = speed;
    ignoreTelemetryRelayUntilRef.current = Date.now() + 2500;
    sendSerialCommand({ manualOverride: true, lightRelay: lightRelayRef.current, fanRelay: nextState, fanSpeed: speed });
  };

  const handleManualFanSpeed = (speed) => {
    const isEngaged = speed > 0;
    handleToggleFan(isEngaged);
  };

  // Dynamic radar gate boundary check: Target is in-bounds only when within active gate distance
  const maxAllowedDistance = (maxGate || 6) * 0.75;
  const isTargetInBounds = presenceDetected && (targetDistance <= maxAllowedDistance || targetDistance === 0);

  // Unified mmWave Direct Automation & Vacant Hold Delay Engine
  useEffect(() => {
    // In manual override mode, relays strictly obey the user's manual toggles
    if (manualOverride) {
      setVacantCountdown(null);
      return;
    }

    if (isTargetInBounds) {
      // OCCUPIED: Cancel any pending vacancy timer & immediately power ON Light & Fan!
      setVacantCountdown(null);
      setLightRelay(true);
      setFanSpeed(100);
      if (isSimulating) {
        sendSerialCommand({ manualOverride: false, lightRelay: true, fanRelay: true, fanSpeed: 100 });
      }
      return;
    }

    // VACANT: Target is either absent or beyond active maxGate boundary
    // If appliances are already fully powered OFF, keep timer inactive
    if (!lightRelay && fanSpeed === 0) {
      setVacantCountdown(null);
      return;
    }

    // Initialize countdown timer with selected occupancyTimeout
    if (vacantCountdown === null) {
      setVacantCountdown(occupancyTimeout);
      return;
    }

    // Countdown reached 0: Vacant hold delay elapsed -> Power OFF both Light and Fan!
    if (vacantCountdown <= 0) {
      setLightRelay(false);
      setFanSpeed(0);
      setVacantCountdown(null);
      sendSerialCommand({ manualOverride: false, lightRelay: false, fanRelay: false, fanSpeed: 0 });
      return;
    }

    // Tick countdown down by 1 every 1000ms
    const timer = setTimeout(() => {
      setVacantCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    isTargetInBounds,
    manualOverride,
    lightRelay,
    fanSpeed,
    vacantCountdown,
    occupancyTimeout,
    isSimulating
  ]);

  // Fan active level: 1 (ON) or 0 (OFF) for direct relay control
  const fanLevel = fanSpeed > 0 ? 1 : 0;

  // Sync Hardware Web Serial Packet directly into state
  const handleTelemetryUpdate = (data) => {
    if (data.presence === false) {
      setPresenceDetected(false);
      setTargetDistance(0);
      setMotionType('none');
      setStaticEnergy(0);
      setMovingEnergy(0);
    } else if (data.presence === true) {
      setPresenceDetected(true);
      if (data.dist !== undefined) setTargetDistance(data.dist);
      if (data.motion !== undefined && data.motion !== '') setMotionType(data.motion);
      if (data.staticEng !== undefined) setStaticEnergy(data.staticEng);
      if (data.movingEng !== undefined) setMovingEnergy(data.movingEng);
    }
    if (data.lux !== undefined) setAmbientLux(data.lux);
    if (data.vacantCountdown !== undefined) {
      setVacantCountdown(data.vacantCountdown);
    }
    if (data.vacantTimeout !== undefined && data.vacantTimeout > 0) {
      setOccupancyTimeout(data.vacantTimeout);
    }
    const canSyncTemp = Date.now() > ignoreTelemetryTempUntilRef.current;
    if (canSyncTemp && data.temp !== undefined) setRoomTemp(data.temp);

    // Handle physical push button event from ESP32 hardware
    if (data.event === 'MANUAL_SWITCH_PHYSICAL_TRIGGER') {
      if (data.manualOverride !== undefined) {
        setManualOverride(data.manualOverride);
        manualOverrideRef.current = data.manualOverride;
      }
      if (data.lightRelay !== undefined) {
        setLightRelay(data.lightRelay);
        lightRelayRef.current = data.lightRelay;
      }
      if (data.fanSpeed !== undefined) {
        setFanSpeed(data.fanSpeed);
        fanSpeedRef.current = data.fanSpeed;
      }
      return;
    }

    // Sync manual override from hardware if present in packet
    if (data.manualOverride !== undefined) {
      if (data.manualOverride !== manualOverrideRef.current) {
        setManualOverride(data.manualOverride);
        manualOverrideRef.current = data.manualOverride;
      }
    }

    // Only update relay outputs from hardware packet if outside manual toggle grace period
    const canSyncRelays = Date.now() > ignoreTelemetryRelayUntilRef.current;
    if (canSyncRelays) {
      if (!manualOverrideRef.current && !data.manualOverride) {
        if (data.lightRelay !== undefined) {
          setLightRelay(data.lightRelay);
          lightRelayRef.current = data.lightRelay;
        }
        if (data.fanRelay !== undefined) {
          const speed = data.fanRelay ? 100 : 0;
          setFanSpeed(speed);
          fanSpeedRef.current = speed;
        } else if (data.fanSpeed !== undefined) {
          setFanSpeed(data.fanSpeed);
          fanSpeedRef.current = data.fanSpeed;
        }
      } else {
        // In manual override mode, sync confirmed physical relay states if sent by hardware
        if (data.lightRelay !== undefined) {
          setLightRelay(data.lightRelay);
          lightRelayRef.current = data.lightRelay;
        }
        if (data.fanRelay !== undefined) {
          const speed = data.fanRelay ? 100 : 0;
          setFanSpeed(speed);
          fanSpeedRef.current = speed;
        } else if (data.fanSpeed !== undefined) {
          setFanSpeed(data.fanSpeed);
          fanSpeedRef.current = data.fanSpeed;
        }
      }
    }

    // Compute dynamic 8-Gate Energy array for visualizer histogram
    const newGates = [0, 0, 0, 0, 0, 0, 0, 0];
    if (data.presence) {
      const targetGateIdx = Math.min(7, Math.max(0, Math.floor(((data.dist || 1.5) / 6.0) * 8)));
      const mainEng = Math.max(data.movingEng || 0, data.staticEng || 0, 65);

      for (let i = 0; i < 8; i++) {
        newGates[i] = 10;
      }
      newGates[targetGateIdx] = mainEng;
      if (targetGateIdx > 0) newGates[targetGateIdx - 1] = Math.round(mainEng * 0.4);
      if (targetGateIdx + 1 < 8) newGates[targetGateIdx + 1] = Math.round(mainEng * 0.3);
    }
    setGateEnergies(newGates);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Application Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        presenceDetected={presenceDetected}
        isTargetInBounds={isTargetInBounds}
        roomTemp={roomTemp}
        ambientLux={ambientLux}
        lightRelay={lightRelay}
        fanSpeed={fanSpeed}
        currentUser={currentUser}
        vacantCountdown={vacantCountdown}
        manualOverride={manualOverride}
        onManualAllOn={handleManualAllOn}
        onManualAllOff={handleManualAllOff}
        onResumeAuto={handleResumeAuto}
        cloudSyncInfo={cloudSyncInfo}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Tab 1: Live Control & Radar Visualizer */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Top Telemetry KPI Metric Cards */}
            <TelemetryCards
              presenceDetected={presenceDetected}
              targetDistance={targetDistance}
              motionType={motionType}
              ambientLux={ambientLux}
              roomTemp={roomTemp}
              lightRelay={lightRelay}
              fanSpeed={fanSpeed}
              fanLevel={fanLevel}
              lightThreshold={lightThreshold}
              vacantCountdown={vacantCountdown}
              maxGate={maxGate}
              manualOverride={manualOverride}
            />

            {/* Split Screen: 24GHz FMCW Radar Canvas + Interactive Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RadarCanvas
                presenceDetected={presenceDetected}
                targetDistance={targetDistance}
                motionType={motionType}
                staticEnergy={staticEnergy}
                movingEnergy={movingEnergy}
                gateEnergies={gateEnergies}
                maxGate={maxGate}
              />

              <SimulatorControl
                presenceDetected={presenceDetected}
                setPresenceDetected={setPresenceDetected}
                targetDistance={targetDistance}
                setTargetDistance={setTargetDistance}
                motionType={motionType}
                setMotionType={setMotionType}
                ambientLux={ambientLux}
                setAmbientLux={setAmbientLux}
                roomTemp={roomTemp}
                setRoomTemp={handleSetRoomTemp}
                lightRelay={lightRelay}
                fanRelay={fanSpeed > 0}
                handleToggleLight={handleToggleLight}
                handleToggleFan={handleToggleFan}
                fanSpeed={fanSpeed}
                fanLevel={fanLevel}
                staticEnergy={staticEnergy}
                setStaticEnergy={setStaticEnergy}
                movingEnergy={movingEnergy}
                setMovingEnergy={setMovingEnergy}
                gateEnergies={gateEnergies}
                setGateEnergies={setGateEnergies}
                vacantCountdown={vacantCountdown}
                maxGate={maxGate}
              />
            </div>

          </div>
        )}

        {/* Tab 2: Classroom Spatial Map */}
        {activeTab === 'classroom' && (
          <ClassroomMap
            presenceDetected={presenceDetected}
            targetDistance={targetDistance}
            motionType={motionType}
            lightRelay={lightRelay}
            fanSpeed={fanSpeed}
            fanLevel={fanLevel}
          />
        )}

        {/* Tab 3: Automation Engine & Calibration (Super Admin Only) */}
        {activeTab === 'automation' && (
          isSuperAdmin ? (
            <AutomationEngine
              lightThreshold={lightThreshold}
              setLightThreshold={setLightThreshold}
              occupancyTimeout={occupancyTimeout}
              setOccupancyTimeout={setOccupancyTimeout}
              vacantCountdown={vacantCountdown}
              setVacantCountdown={setVacantCountdown}
              lightRelay={lightRelay}
              setLightRelay={setLightRelay}
              fanSpeed={fanSpeed}
              setFanSpeed={setFanSpeed}
              fanLevel={fanLevel}
              manualOverride={manualOverride}
              setManualOverride={setManualOverride}
              handleToggleManualOverride={handleToggleManualOverride}
              handleManualAllOn={handleManualAllOn}
              handleManualAllOff={handleManualAllOff}
              handleResumeAuto={handleResumeAuto}
              handleToggleLight={handleToggleLight}
              handleToggleFan={handleToggleFan}
              handleManualFanSpeed={handleManualFanSpeed}
              presenceDetected={presenceDetected}
              targetDistance={targetDistance}
              ambientLux={ambientLux}
              roomTemp={roomTemp}
              tempMin={tempMin}
              setTempMin={setTempMin}
              tempMax={tempMax}
              setTempMax={setTempMax}
              maxGate={maxGate}
              setMaxGate={setMaxGate}
              staticSens={staticSens}
              setStaticSens={setStaticSens}
              motionSens={motionSens}
              setMotionSens={setMotionSens}
              motionType={motionType}
              staticEnergy={staticEnergy}
              movingEnergy={movingEnergy}
            />
          ) : (
            <RestrictedModuleBarrier moduleName="Automation & Radar Calibration Engine" setActiveTab={setActiveTab} />
          )
        )}

        {/* Tab 4: Energy Analytics */}
        {activeTab === 'analytics' && (
          <EnergyAnalytics 
            lightRelay={lightRelay}
            fanSpeed={fanSpeed}
            presenceDetected={presenceDetected}
            targetDistance={targetDistance}
            isSimulating={isSimulating}
            todayUsage={todayUsage}
            setTodayUsage={setTodayUsage}
            cloudSyncInfo={cloudSyncInfo}
          />
        )}

        {/* Tab 5: Circuit Schematics (Super Admin Only) */}
        {activeTab === 'schematics' && (
          isSuperAdmin ? (
            <HardwareSchematics />
          ) : (
            <RestrictedModuleBarrier moduleName="Circuit Schematics & Hardware Guide" setActiveTab={setActiveTab} />
          )
        )}

        {/* Tab 6: Web Serial Gateway (Accessible to Normal Users & Super Admins) */}
        <div style={{ display: activeTab === 'gateway' ? 'block' : 'none' }}>
          <SerialGateway
            isSimulating={isSimulating}
            setIsSimulating={setIsSimulating}
            onTelemetryUpdate={handleTelemetryUpdate}
            maxGate={maxGate}
          />
        </div>

        {/* Tab 7: Firebase Admin Security Portal */}
        {activeTab === 'admin' && (
          <AdminLogin
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            setActiveTab={setActiveTab}
            cloudSyncInfo={cloudSyncInfo}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 font-mono">
        SmartClass 24GHz mmWave Intelligent Automation System
      </footer>

    </div>
  );
}
