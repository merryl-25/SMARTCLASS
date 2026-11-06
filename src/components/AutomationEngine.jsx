import React, { useState } from 'react';
import { 
  Settings, Zap, Sliders, Clock, Thermometer, Sun, Shield, Save, Check, 
  Cpu, Radio, Lightbulb, Fan, AlertCircle, CheckCircle2, Lock, Unlock,
  Power, PowerOff, RefreshCw, Gauge, Target, Compass
} from 'lucide-react';

export default function AutomationEngine({ 
  lightThreshold = 200, 
  setLightThreshold, 
  occupancyTimeout = 5, 
  setOccupancyTimeout, 
  vacantCountdown = null,
  setVacantCountdown,
  lightRelay = true, 
  setLightRelay, 
  fanSpeed = 100, 
  setFanSpeed,
  fanLevel = 1,
  manualOverride = false,
  setManualOverride,
  handleToggleManualOverride: propToggleManualOverride,
  handleManualAllOn: propManualAllOn,
  handleManualAllOff: propManualAllOff,
  handleResumeAuto: propResumeAuto,
  handleToggleLight: propToggleLight,
  handleToggleFan: propToggleFan,
  handleManualFanSpeed: propManualFanSpeed,
  presenceDetected = true,
  targetDistance = 2.15,
  ambientLux = 140,
  roomTemp = 29,
  tempMin = 25,
  setTempMin,
  tempMax = 34,
  setTempMax,
  maxGate = 6,
  setMaxGate,
  staticSens = 80,
  setStaticSens,
  motionSens = 70,
  setMotionSens,
  motionType = 'moving',
  staticEnergy = 45,
  movingEnergy = 80
}) {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [flashDetails, setFlashDetails] = useState('');

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

  // Safe prop handlers
  const handleTempMinChange = (val) => {
    const clamped = Math.min(Math.max(15, val), (tempMax || 34) - 1);
    if (setTempMin) setTempMin(clamped);
    sendSerialCommand({ tempMin: clamped });
  };

  const handleTempMaxChange = (val) => {
    const clamped = Math.max(Math.min(50, val), (tempMin || 25) + 1);
    if (setTempMax) setTempMax(clamped);
    sendSerialCommand({ tempMax: clamped });
  };

  const handleMaxGateSelect = (gateNum) => {
    if (setMaxGate) setMaxGate(gateNum);
    sendSerialCommand({ maxGate: gateNum });
  };

  const handleVacantTimeoutSelect = (sec) => {
    if (setOccupancyTimeout) setOccupancyTimeout(sec);
    sendSerialCommand({ vacantTimeout: sec });
  };

  const handleLuxChange = (lux) => {
    if (setLightThreshold) setLightThreshold(lux);
    sendSerialCommand({ luxCutoff: lux });
  };

  const handleStaticSensChange = (sens) => {
    if (setStaticSens) setStaticSens(sens);
    sendSerialCommand({ staticSens: sens });
  };

  const handleMotionSensChange = (sens) => {
    if (setMotionSens) setMotionSens(sens);
    sendSerialCommand({ motionSens: sens });
  };

  // Manual Master Controls (uses centralized handler if provided)
  const handleManualAllOn = propManualAllOn || (() => {
    if (setManualOverride) setManualOverride(true);
    if (setLightRelay) setLightRelay(true);
    if (setFanSpeed) setFanSpeed(100);
    if (setVacantCountdown) setVacantCountdown(null);
    sendSerialCommand({ manualOverride: true, lightRelay: true, fanRelay: true, fanSpeed: 100 });
  });

  const handleManualAllOff = propManualAllOff || (() => {
    if (setManualOverride) setManualOverride(true);
    if (setLightRelay) setLightRelay(false);
    if (setFanSpeed) setFanSpeed(0);
    if (setVacantCountdown) setVacantCountdown(null);
    sendSerialCommand({ manualOverride: true, lightRelay: false, fanRelay: false, fanSpeed: 0 });
  });

  const handleResumeAuto = propResumeAuto || (() => {
    if (setManualOverride) setManualOverride(false);
    sendSerialCommand({ manualOverride: false });
  });

  const handleToggleManualOverride = propToggleManualOverride || ((checked) => {
    if (setManualOverride) setManualOverride(checked);
    sendSerialCommand({ manualOverride: checked, lightRelay, fanRelay: fanSpeed > 0, fanSpeed });
  });

  const handleToggleLight = propToggleLight || ((nextState) => {
    if (setManualOverride) setManualOverride(true);
    if (setLightRelay) setLightRelay(nextState);
    sendSerialCommand({ manualOverride: true, lightRelay: nextState, fanRelay: fanSpeed > 0, fanSpeed });
  });

  const handleToggleFan = propToggleFan || ((nextState) => {
    if (setManualOverride) setManualOverride(true);
    const speed = nextState ? 100 : 0;
    if (setFanSpeed) setFanSpeed(speed);
    sendSerialCommand({ manualOverride: true, lightRelay, fanRelay: nextState, fanSpeed: speed });
  });

  const handleManualFanSpeed = propManualFanSpeed || ((speed) => {
    const nextState = speed > 0;
    handleToggleFan(nextState);
  });

  const handleSaveConfig = () => {
    const configPayload = {
      maxGate,
      vacantTimeout: occupancyTimeout,
      staticSens,
      motionSens
    };
    sendSerialCommand(configPayload);
    setFlashDetails(`Gate: G${maxGate} (${(maxGate*0.75).toFixed(2)}m) | Vacant Timeout: ${occupancyTimeout}s | Direct 2-Channel Relay Automation`);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Direct mmWave presence detection (boundary restrictions & 15cm cutoff eliminated)
  const isTargetInBounds = presenceDetected;
  const maxDistanceCutoff = maxGate * 0.75;
  
  // Calculate dynamic fan speed based on curve
  let dynamicCalculatedFanSpeed = 0;
  if (roomTemp >= tempMin) {
    if (roomTemp >= tempMax) {
      dynamicCalculatedFanSpeed = 100;
    } else {
      const ratio = (roomTemp - tempMin) / Math.max(1, tempMax - tempMin);
      dynamicCalculatedFanSpeed = Math.round(30 + ratio * 70);
    }
  }

  // Vacant timeout options required by user: 3s, 5s, 10s, 15s
  const timeoutOptions = [3, 5, 10, 15];

  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-base">Automation & Radar Calibration Engine</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-bold ${
                manualOverride ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {manualOverride ? 'MANUAL OVERRIDE' : 'AUTO CALIBRATED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Configure ESP32 firmware registers, LD2410 gate sensitivity & automated appliance logic</p>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg self-start sm:self-auto ${
            savedSuccess 
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
          }`}
        >
          {savedSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'CONFIG FLASHED TO ESP32 EEPROM!' : 'SAVE & FLASH ALL CONFIG'}</span>
        </button>
      </div>

      {/* Flashed Success Toast */}
      {savedSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-3 text-xs text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold">Hardware Registers Successfully Flashed!</span>
            <p className="font-mono text-[11px] text-emerald-400/80">{flashDetails}</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION: MANUAL HARDWARE RELAY & ACTUATOR SWITCH PANEL (USER REQUIREMENT)
         ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border-2 border-cyan-500/40 p-5 rounded-2xl flex flex-col gap-5 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
        
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${manualOverride ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'}`}>
              {manualOverride ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Manual Hardware Switch & Actuator Override
              </h4>
              <p className="text-xs text-slate-400">Directly control physical relays & bypass mmWave sensor automation with 1-click master buttons</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border ${
              manualOverride ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${manualOverride ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              {manualOverride ? 'MANUAL OVERRIDE ACTIVE' : 'AUTOMATED LOGIC RUNNING'}
            </span>
          </div>
        </div>

        {/* Individual Component Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Master Override Mode Toggle */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Rule Bypass Lock</span>
              <span className="text-[10px] text-slate-400">Lock relays to manual state</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={manualOverride}
                onChange={(e) => handleToggleManualOverride(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Individual Light Relay Switch */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            lightRelay ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${lightRelay ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  Light Relay
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    lightRelay ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {lightRelay ? 'ON' : 'OFF'}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">Channel 1 (GPIO 26)</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={lightRelay}
                onChange={(e) => handleToggleLight(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Individual Fan Relay Switch */}
          <div className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
            fanSpeed > 0 ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${fanSpeed > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
                  <Fan className={`w-4 h-4 ${fanSpeed > 0 ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    Fan Power
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      fanSpeed > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {fanSpeed > 0 ? `${fanSpeed}%` : 'OFF'}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">Channel 2 (GPIO 27)</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={fanSpeed > 0}
                  onChange={(e) => handleToggleFan(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Manual Fan Speed Slider */}
            {fanSpeed > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-mono">Speed:</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={fanSpeed}
                  onChange={(e) => handleManualFanSpeed(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-[10px] font-mono font-bold text-cyan-400">{fanSpeed}%</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* =========================================================================
            SECTION 1: LD2410 RADAR SENSITIVITY & GATE CALIBRATION
           ========================================================================= */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> LD2410 Radar Gate & Sensitivity Calibration
            </h4>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Active Sync
            </span>
          </div>

          {/* Static Micro-Motion Sensitivity */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                Static Micro-Motion Sensitivity
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-amber-400 font-bold">{staticSens}%</span>
                <span className="text-[10px] text-slate-400">(Trigger: ≥{Math.max(5, 100 - staticSens)}% Energy)</span>
              </div>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={staticSens}
              onChange={(e) => handleStaticSensChange(parseInt(e.target.value))}
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Detects micro-breathing & reading postures</span>
              <span className="font-mono text-slate-400">Current Target Energy: {staticEnergy}%</span>
            </div>
          </div>

          {/* Active Motion Sensitivity */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Active Motion Target Sensitivity
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-emerald-400 font-bold">{motionSens}%</span>
                <span className="text-[10px] text-slate-400">(Trigger: ≥{Math.max(5, 100 - motionSens)}% Energy)</span>
              </div>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={motionSens}
              onChange={(e) => handleMotionSensChange(parseInt(e.target.value))}
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Detects walking, standing up, gestures</span>
              <span className="font-mono text-slate-400">Current Target Energy: {movingEnergy}%</span>
            </div>
          </div>

          {/* Interactive Max Sensing Range Gate Selector (G1 to G8) */}
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                Maximum Sensing Gate Cutoff Boundary
              </span>
              <span className="font-mono text-purple-400 font-bold">
                Gate {maxGate} ({(maxGate * 0.75).toFixed(2)}m)
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((gate) => {
                const isSelected = gate === maxGate;
                const isWithinRange = gate <= maxGate;
                return (
                  <button
                    key={gate}
                    onClick={() => handleMaxGateSelect(gate)}
                    className={`py-2 px-1 rounded-lg text-xs font-mono font-bold border transition-all flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105'
                        : isWithinRange
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
                        : 'bg-slate-950/80 border-slate-800/60 text-slate-600 opacity-60 hover:opacity-100 hover:text-slate-400'
                    }`}
                  >
                    <span>G{gate}</span>
                    <span className="text-[9px] font-normal opacity-80">{(gate * 0.75).toFixed(1)}m</span>
                    <span className={`text-[7px] px-1 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-slate-950 text-cyan-300' : isWithinRange ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-900 text-slate-600'
                    }`}>
                      {isWithinRange ? 'ACTIVE' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Occupancy Live Status Banner */}
            <div className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between ${
              presenceDetected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
            }`}>
              <span>
                Target: <strong className="font-mono text-cyan-400">{presenceDetected ? `${targetDistance.toFixed(2)}m` : '0m'}</strong> | 
                Motion: <strong className="font-mono text-amber-300">{presenceDetected ? motionType : 'none'}</strong> | 
                Range Gate: <strong className="font-mono text-slate-300">G1-G{maxGate} ({maxDistanceCutoff.toFixed(2)}m)</strong>
              </span>
              <span className="font-bold uppercase tracking-wider text-slate-300">
                {presenceDetected ? 'OCCUPIED (PRESENCE ACTIVE)' : 'VACANT'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              {maxGate === 1 
                ? `Only Gate 1 (0.75m) is active. Gates 2 to 8 are disabled and will not activate or highlight.` 
                : `Gates 1 to ${maxGate} (${(maxGate * 0.75).toFixed(2)}m) active. Gates ${maxGate + 1} to 8 disabled.`}
            </span>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: APPLIANCE AUTOMATION RULES & VACANT DELAY SETTING (3s, 5s, 10s, 15s)
           ========================================================================= */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Appliance Automation Policy & Vacant Delay
            </h4>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/60 font-semibold">
              mmWave Direct Drive (No LDR/DHT22)
            </span>
          </div>

          {/* Direct Drive Feature Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-cyan-500/30 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Lighting Relay (GPIO 26)
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${lightRelay ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    {lightRelay ? 'ACTIVE' : 'IDLE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Energizes instantly upon 24GHz radar occupancy detection. Automatically powers off when vacant timeout elapses.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Fan className={`w-5 h-5 ${fanSpeed > 0 ? 'animate-spin text-amber-400' : 'text-slate-500'}`} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Fan Relay (GPIO 27)
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    fanSpeed > 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {fanSpeed > 0 ? 'ACTIVE (ON)' : 'STANDBY (OFF)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Direct relay actuation synchronized with mmWave presence detection. Motor driver eliminated to prevent presence logic overrides.
                </p>
              </div>
            </div>
          </div>

          {/* =========================================================================
              VACANT HOLD DELAY SETTING: MUST BE 3sec, 5sec, 10sec, 15sec (USER REQUIREMENT)
             ========================================================================= */}
          <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Vacant Hold Delay Timeout Setting
              </span>
              <span className="font-mono text-cyan-400 font-bold">{occupancyTimeout} Seconds</span>
            </div>

            {/* Discrete 3s, 5s, 10s, 15s Selector Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {timeoutOptions.map((sec) => {
                const isSelected = occupancyTimeout === sec;
                return (
                  <button
                    key={sec}
                    onClick={() => handleVacantTimeoutSelect(sec)}
                    className={`py-2.5 rounded-xl text-xs font-mono font-bold border transition-all flex flex-col items-center gap-0.5 ${
                      isSelected 
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105' 
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{sec}s</span>
                    <span className="text-[9px] font-normal opacity-80">{sec} Seconds</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[10px] text-slate-500">
              Configured duration to hold appliances ON after zero mmWave presence before auto-cutoff.
            </span>
          </div>

        </div>

      </div>

      {/* =========================================================================
          SECTION 3: LIVE AUTOMATION LOGIC EVALUATOR STATUS PANEL
         ========================================================================= */}
      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live Firmware Automation Evaluator</h4>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${
            manualOverride ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {manualOverride ? 'STATUS: MANUAL OVERRIDE (BYPASSED)' : 'STATUS: LIVE SENSOR LOGIC ACTIVE'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Rule Card 1: mmWave Occupancy */}
          <div className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all ${
            presenceDetected 
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
              : vacantCountdown !== null 
              ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Radio className="w-3.5 h-3.5 text-cyan-400" /> 1. mmWave Presence Detection
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                presenceDetected 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : vacantCountdown !== null 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {presenceDetected 
                  ? 'OCCUPIED' 
                  : vacantCountdown !== null 
                  ? `VACANT (${vacantCountdown}s DELAY)` 
                  : 'VACANT'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {presenceDetected 
                ? `Target detected at ${targetDistance.toFixed(2)}m (${motionType}). Both Light & Fan relays firmly energized.` 
                : vacantCountdown !== null 
                ? `Room vacant: countdown active (${vacantCountdown}s remaining before relays de-energize).` 
                : 'No human presence detected by 24GHz mmWave radar. Appliances de-energized.'}
            </p>
          </div>

          {/* Rule Card 2: Lighting Logic */}
          <div className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all ${
            lightRelay 
              ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> 2. Auto Light Relay
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                lightRelay ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-500'
              }`}>
                {lightRelay ? 'LIGHTS ON' : 'LIGHTS OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Condition: {manualOverride ? 'Manual Override Forced ON' : `Occupied (${isTargetInBounds ? 'YES' : 'NO'})`} &rarr; <strong className="text-white">{lightRelay ? 'RELAY ENERGIZED' : 'RELAY OFF'}</strong> <span className="text-[10px] text-slate-500">(Direct mmWave switching)</span>
            </p>
          </div>

          {/* Rule Card 3: Fan Relay Automation Logic */}
          <div className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all ${
            fanSpeed > 0 
              ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Fan className={`w-3.5 h-3.5 ${fanSpeed > 0 ? 'text-amber-400 animate-spin' : 'text-slate-500'}`} /> 3. Auto Fan Relay (GPIO 27)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                fanSpeed > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-500'
              }`}>
                {fanSpeed > 0 ? 'RELAY ACTIVE (ON)' : 'RELAY IDLE (OFF)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Condition: {manualOverride ? 'Manual Override Forced ON' : `Occupied (${isTargetInBounds ? 'YES' : 'NO'})`} &rarr; <strong className="text-white">{fanSpeed > 0 ? 'FAN RELAY ENERGIZED' : 'FAN RELAY OFF'}</strong> <span className="text-[10px] text-slate-500">(Direct mmWave presence interlock)</span>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
