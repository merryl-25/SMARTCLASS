import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Usb, Wifi, Play, Square, RefreshCw, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';

export default function SerialGateway({ isSimulating, setIsSimulating, onTelemetryUpdate, maxGate = 6 }) {
  const [portConnected, setPortConnected] = useState(false);
  const [logs, setLogs] = useState([
    '[SYSTEM] Web Serial Gateway Engine Ready.',
    '[SYSTEM] Plug your ESP32 via USB cable when ready to interface physical hardware.',
    '[INFO] Supported baud rate: 115200 Baud (LD2410 Standard Frame Rate).'
  ]);

  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  useEffect(() => {
    onTelemetryUpdateRef.current = onTelemetryUpdate;
  }, [onTelemetryUpdate]);

  const activePortRef = useRef(null);

  const addLog = (msg) => {
    setLogs((prev) => [...prev.slice(-40), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleDisconnectSerial = async () => {
    try {
      if (window.esp32SerialWriter) {
        try {
          await window.esp32SerialWriter.close();
        } catch (e) {}
        window.esp32SerialWriter = null;
      }
      if (activePortRef.current) {
        try {
          await activePortRef.current.close();
        } catch (e) {}
        activePortRef.current = null;
      }
      setPortConnected(false);
      addLog('[SYSTEM] USB Serial Port disconnected.');
    } catch (err) {
      addLog(`[ERROR] Disconnect error: ${err.message}`);
    }
  };

  const handleConnectSerial = async () => {
    if (portConnected) {
      await handleDisconnectSerial();
      return;
    }

    if (!('serial' in navigator)) {
      alert('Web Serial API is supported in Chrome, Edge, and Opera browsers. Please use Google Chrome or MS Edge.');
      return;
    }

    try {
      addLog('Requesting USB Serial Port access...');
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      activePortRef.current = port;

      // Save writer stream reference for sending commands to ESP32
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
      const writer = textEncoder.writable.getWriter();
      window.esp32SerialWriter = writer;

      setPortConnected(true);
      setIsSimulating(false);
      addLog('CONNECTED! ESP32 Serial Stream active at 115200 Baud.');

      // Automatically sync current cutoff gate to ESP32 hardware
      try {
        const syncPayload = JSON.stringify({ maxGate: maxGate || 6 }) + '\n';
        await writer.write(syncPayload);
        addLog(`[SYNC] Initialized ESP32 Hardware Sensing Gate: Gate ${maxGate || 6} (${((maxGate || 6)*0.75).toFixed(2)}m)`);
      } catch (syncErr) {
        // non-blocking
      }

      // Read loop stream
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      let lineBuffer = '';

      while (true) {
        try {
          const { value, done } = await reader.read();
          if (done) {
            reader.releaseLock();
            break;
          }
          if (value) {
            lineBuffer += value;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop(); // keep last incomplete chunk

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                addLog(`[ESP32] ${trimmed}`);
                try {
                  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    const data = JSON.parse(trimmed);
                    if (onTelemetryUpdateRef.current) onTelemetryUpdateRef.current(data);
                  }
                } catch (e) {
                  // Non-JSON debug output
                }
              }
            }
          }
        } catch (readErr) {
          // Ignore transient UART boot glitches / Framing errors when ESP32 resets
          addLog(`[RECOVERY] UART Noise / Boot Reset (${readErr.message || 'Framing glitch'}). Continuing stream...`);
          // Brief pause before reading next frame
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    } catch (err) {
      let extraHint = '';
      if (err.message?.toLowerCase().includes('open') || err.message?.toLowerCase().includes('access') || err.message?.toLowerCase().includes('busy')) {
        extraHint = ' -> TIP: Close Arduino IDE Serial Monitor or any other app using this COM port.';
      }
      addLog(`[ERROR] Serial Connection Failed: ${err.message}${extraHint}`);
      setPortConnected(false);
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Usb className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Web Serial API Hardware Gateway</h3>
            <p className="text-xs text-slate-400">Direct USB serial connection between browser and physical ESP32 microcontroller</p>
          </div>
        </div>

        <button
          onClick={handleConnectSerial}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border ${
            portConnected 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
              : 'bg-cyan-500 text-slate-950 border-cyan-400 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
          }`}
        >
          <Usb className="w-4 h-4" />
          <span>{portConnected ? 'CONNECTED TO ESP32 (115200)' : 'CONNECT ESP32 HARDWARE VIA USB'}</span>
        </button>
      </div>

      {/* Mode Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
        isSimulating 
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          <span className="font-semibold">
            {isSimulating ? 'Current Active Mode: SOFTWARE RADAR SIMULATOR' : 'Current Active Mode: LIVE PHYSICAL ESP32 HARDWARE STREAM'}
          </span>
        </div>
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className="underline font-mono hover:text-white"
        >
          Switch to {isSimulating ? 'Hardware Web Serial' : 'Simulator'}
        </button>
      </div>

      {/* Terminal Output Window */}
      <div className="bg-[#050810] border border-slate-800 rounded-xl p-4 flex flex-col gap-2 font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-slate-400 text-[11px]">
          <span className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" /> Live Serial Log Output
          </span>
          <span>Baud Rate: 115200 | Port: COM / ttyUSB</span>
        </div>

        <div className="h-64 overflow-y-auto space-y-1 text-slate-300 pr-2">
          {logs.map((log, i) => (
            <div 
              key={i} 
              className={log.includes('CONNECTED') ? 'text-emerald-400 font-bold' : log.includes('ERROR') ? 'text-rose-400' : 'text-slate-300'}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
