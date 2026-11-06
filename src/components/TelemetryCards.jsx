import React from 'react';
import { Radio, Lightbulb, Fan, Cpu, Thermometer, Sun, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TelemetryCards({ 
  presenceDetected, 
  targetDistance, 
  motionType, 
  ambientLux, 
  roomTemp, 
  lightRelay, 
  fanSpeed,
  fanLevel = 0,
  lightThreshold = 200,
  vacantCountdown = null,
  maxGate = 6,
  manualOverride = false
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Telemetry Card 1: Presence Detection (Direct Pure mmWave) */}
      <div className={`glass-panel p-5 relative overflow-hidden transition-all ${
        presenceDetected 
          ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
          : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Radar Presence</span>
          <div className={`p-2 rounded-xl ${
            presenceDetected 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-slate-800 text-slate-500'
          }`}>
            <Radio className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold text-white font-['Outfit']">
            {presenceDetected ? 'OCCUPIED' : 'VACANT'}
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
          <span>Target Distance:</span>
          <span className="font-mono text-cyan-400 font-bold">
            {presenceDetected ? `${targetDistance.toFixed(2)}m` : '0.00m'}
          </span>
        </p>
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">
            {vacantCountdown !== null ? 'Vacant Hold Delay:' : 'Radar Status:'}
          </span>
          <span className={`font-semibold font-mono ${vacantCountdown !== null ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
            {vacantCountdown !== null ? `Auto-OFF in ${vacantCountdown}s` : (presenceDetected ? 'Target Active' : 'Room Clear')}
          </span>
        </div>
      </div>

      {/* Telemetry Card 2: Smart Light Control */}
      <div className={`glass-panel p-5 relative overflow-hidden transition-all ${
        lightRelay ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Lighting Control</span>
          <div className={`p-2 rounded-xl ${lightRelay ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
            <Lightbulb className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold text-white font-['Outfit']">
            {lightRelay ? 'LIGHTS ON' : 'LIGHTS OFF'}
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
          <span>Mode:</span>
          <span className={`font-mono font-bold text-[11px] ${manualOverride ? 'text-amber-400' : 'text-cyan-400'}`}>
            {manualOverride ? 'MANUAL OVERRIDE' : '24GHz mmWave Auto'}
          </span>
        </p>
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Relay Channel:</span>
          <span className="font-mono text-slate-300">GPIO 26 (Optocoupler Ch 1)</span>
        </div>
      </div>

      {/* Telemetry Card 3: Smart Fan Relay Automation */}
      <div className={`glass-panel p-5 relative overflow-hidden transition-all ${
        fanSpeed > 0 ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Fan Control (Relay Ch 2)</span>
          <div className={`p-2 rounded-xl ${fanSpeed > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
            <Fan className={`w-5 h-5 ${fanSpeed > 0 ? 'animate-spin' : ''}`} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold text-white font-['Outfit']">
            {fanSpeed > 0 ? 'FAN ACTIVE (ON)' : 'FAN STANDBY (OFF)'}
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
          <span>Mode:</span>
          <span className={`font-mono font-bold text-[11px] ${manualOverride ? 'text-amber-400' : 'text-amber-300'}`}>
            {manualOverride ? 'MANUAL OVERRIDE' : '24GHz mmWave Auto'}
          </span>
        </p>
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Relay Channel:</span>
          <span className="font-mono text-slate-300">GPIO 27 (Optocoupler Ch 2)</span>
        </div>
      </div>

      {/* Telemetry Card 4: Microcontroller Health */}
      <div className="glass-panel p-5 relative overflow-hidden border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ESP32 Gateway</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold text-white font-['Outfit'] flex items-center gap-2">
            ONLINE <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
          <span>UART Protocol:</span>
          <span className="font-mono text-purple-400 font-bold">115200 Baud</span>
        </p>
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Radar Module:</span>
          <span className="font-mono text-slate-300">HLK-LD2410C</span>
        </div>
      </div>

    </div>
  );
}
