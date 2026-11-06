import React, { useState } from 'react';
import { 
  Sliders, UserCheck, UserX, Sun, Thermometer, Play, Pause, 
  RefreshCw, Cpu, Activity, Power, PowerOff, Unlock, Lock, 
  Fan, Zap, Lightbulb, CheckCircle2, Clock 
} from 'lucide-react';

export default function SimulatorControl({ 
  presenceDetected, 
  setPresenceDetected, 
  targetDistance, 
  setTargetDistance, 
  motionType, 
  setMotionType, 
  ambientLux, 
  setAmbientLux, 
  roomTemp = 29, 
  setRoomTemp, 
  lightRelay = false,
  fanRelay = false,
  handleToggleLight,
  handleToggleFan,
  fanSpeed = 100,
  fanLevel = 1,
  staticEnergy, 
  setStaticEnergy, 
  movingEnergy, 
  setMovingEnergy, 
  gateEnergies, 
  setGateEnergies, 
  vacantCountdown = null, 
  maxGate = 6
}) {
  const [autoScenario, setAutoScenario] = useState(false);

  // Preset Scenario Handlers strictly respecting active maxGate
  const handleEnterRoom = () => {
    setPresenceDetected(true);
    setMotionType('moving');
    const safeDist = Math.max(0.4, Number(((maxGate * 0.75) * 0.65).toFixed(2)));
    setTargetDistance(safeDist);
    setMovingEnergy(85);
    setStaticEnergy(25);

    // Only populate active gates up to maxGate! Inactive gates remain 0
    const energies = [0, 0, 0, 0, 0, 0, 0, 0];
    const targetIdx = Math.min(maxGate - 1, Math.max(0, Math.floor((safeDist / 6.0) * 8)));
    for (let i = 0; i < maxGate; i++) energies[i] = 10;
    energies[targetIdx] = 85;
    if (targetIdx > 0) energies[targetIdx - 1] = 30;
    if (targetIdx + 1 < maxGate) energies[targetIdx + 1] = 25;
    setGateEnergies(energies);
  };

  const handleSitStill = () => {
    setPresenceDetected(true);
    setMotionType('static');
    const safeDist = Math.max(0.35, Number(((maxGate * 0.75) * 0.55).toFixed(2)));
    setTargetDistance(safeDist);
    setMovingEnergy(5);
    setStaticEnergy(90); // Micro-motion static chest movement

    // Only populate active gates up to maxGate! Inactive gates remain 0
    const energies = [0, 0, 0, 0, 0, 0, 0, 0];
    const targetIdx = Math.min(maxGate - 1, Math.max(0, Math.floor((safeDist / 6.0) * 8)));
    for (let i = 0; i < maxGate; i++) energies[i] = 5;
    energies[targetIdx] = 90;
    if (targetIdx > 0) energies[targetIdx - 1] = 20;
    if (targetIdx + 1 < maxGate) energies[targetIdx + 1] = 15;
    setGateEnergies(energies);
  };

  const handleLeaveRoom = () => {
    setPresenceDetected(false);
    setMotionType('none');
    setTargetDistance(0);
    setMovingEnergy(0);
    setStaticEnergy(0);
    setGateEnergies([0, 0, 0, 0, 0, 0, 0, 0]);
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-semibold text-white text-sm">Interactive mmWave Radar Simulator</h3>
            <p className="text-xs text-slate-400">Simulate 24GHz FMCW presence & automated appliance switching</p>
          </div>
        </div>
        <span className="badge badge-amber text-[10px]">Active Demo Mode</span>
      </div>

      {/* Preset Action Trigger Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleEnterRoom}
          className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
            presenceDetected && motionType === 'moving'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-5 h-5 text-emerald-400" />
          <span>1. Person Walks In</span>
          <span className="text-[10px] font-normal text-slate-400">Moving Target</span>
        </button>

        <button
          onClick={handleSitStill}
          className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
            presenceDetected && motionType === 'static'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-5 h-5 text-amber-400" />
          <span>2. Sits Motionless</span>
          <span className="text-[10px] font-normal text-slate-400">Micro-Breathing</span>
        </button>

        <button
          onClick={handleLeaveRoom}
          className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
            !presenceDetected
              ? 'bg-slate-800/80 border-slate-700 text-slate-200 shadow-[0_0_12px_rgba(100,116,129,0.2)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <UserX className="w-5 h-5 text-slate-400" />
          <span>3. Leaves Room</span>
          <span className="text-[10px] font-normal text-slate-400">
            Vacant Auto OFF
          </span>
        </button>
      </div>

      {/* Manual Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        
        {/* Distance Slider */}
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Target Distance</span>
            <span className="font-mono text-cyan-400 font-bold">{targetDistance.toFixed(2)} meters</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="6.0"
            step="0.05"
            value={targetDistance}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setTargetDistance(val);
              if (!presenceDetected) setPresenceDetected(true);
              const energies = [0, 0, 0, 0, 0, 0, 0, 0];
              const targetIdx = Math.min(maxGate - 1, Math.max(0, Math.floor((val / 6.0) * 8)));
              for (let i = 0; i < maxGate; i++) energies[i] = 10;
              energies[targetIdx] = 75;
              if (targetIdx > 0) energies[targetIdx - 1] = 30;
              if (targetIdx + 1 < maxGate) energies[targetIdx + 1] = 20;
              setGateEnergies(energies);
            }}
          />
          <span className="text-[10px] text-slate-500">Distance from LD2410 mmWave sensor</span>
        </div>

        {/* Moving Energy Slider */}
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Moving Energy
            </span>
            <span className="font-mono text-cyan-400 font-bold">{movingEnergy}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={movingEnergy}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setMovingEnergy(val);
              if (val > 10) {
                setPresenceDetected(true);
                setMotionType('moving');
              } else if (staticEnergy <= 10) {
                setPresenceDetected(false);
                setMotionType('none');
                setTargetDistance(0);
                setGateEnergies([0, 0, 0, 0, 0, 0, 0, 0]);
              } else {
                setMotionType('static');
              }
            }}
          />
          <span className="text-[10px] text-slate-500">Walking / Gesturing activity level</span>
        </div>

        {/* Static Breathing Energy Slider */}
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Static Energy
            </span>
            <span className="font-mono text-amber-400 font-bold">{staticEnergy}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={staticEnergy}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setStaticEnergy(val);
              if (val > 10) {
                setPresenceDetected(true);
                setMotionType(movingEnergy > 10 ? 'moving + static' : 'static');
              } else if (movingEnergy <= 10) {
                setPresenceDetected(false);
                setMotionType('none');
                setTargetDistance(0);
                setGateEnergies([0, 0, 0, 0, 0, 0, 0, 0]);
              } else {
                setMotionType('moving');
              }
            }}
          />
          <span className="text-[10px] text-slate-500">24GHz chest breathing detection</span>
        </div>

      </div>

      {/* Direct 2-Channel Relay Actuation Panel (Motor Driver Removed) */}
      <div className="bg-slate-900/70 p-4 rounded-xl border border-cyan-500/30 flex flex-col gap-3.5 shadow-[0_0_15px_rgba(6,182,212,0.08)]">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-['Outfit'] flex items-center gap-1.5">
                <span>Direct 2-Channel Relay Actuation</span>
                <span className="badge badge-cyan text-[9px] font-mono">OPTOCOUPLER 5V</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Pure mmWave presence automation (Motor driver eliminated for 100% reliable presence logic)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
              presenceDetected 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {presenceDetected ? 'RADAR: OCCUPIED (RELAYS ENERGIZED)' : 'RADAR: VACANT (STANDBY)'}
            </span>
          </div>
        </div>

        {/* 2-Channel Relay Visual Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
          
          {/* Relay Channel 1: Room Light */}
          <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
            lightRelay 
              ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${lightRelay ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-500'}`}>
                  <Lightbulb className={`w-4 h-4 ${lightRelay ? 'text-cyan-300 animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Channel 1: Light</div>
                  <div className="text-[10px] text-cyan-400">GPIO 26 (Active LOW)</div>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                lightRelay ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50' : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}>
                {lightRelay ? 'ON (0V)' : 'OFF (3.3V)'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <span className="text-slate-500">Manual Toggle:</span>
              <button
                type="button"
                onClick={() => handleToggleLight && handleToggleLight(!lightRelay)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  lightRelay 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                }`}
              >
                {lightRelay ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>
          </div>

          {/* Relay Channel 2: Room Fan */}
          <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
            fanSpeed > 0 
              ? 'bg-amber-500/10 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${fanSpeed > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900 text-slate-500'}`}>
                  <Fan className={`w-4 h-4 ${fanSpeed > 0 ? 'animate-spin text-amber-300' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Channel 2: Fan</div>
                  <div className="text-[10px] text-amber-400">GPIO 27 (Active LOW)</div>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                fanSpeed > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50' : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}>
                {fanSpeed > 0 ? 'ON (0V)' : 'OFF (3.3V)'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <span className="text-slate-500">Manual Toggle:</span>
              <button
                type="button"
                onClick={() => handleToggleFan && handleToggleFan(!(fanSpeed > 0))}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  fanSpeed > 0 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                {fanSpeed > 0 ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
