import React, { useState } from 'react';
import { Cpu, Zap, Radio, Thermometer, Sun, ArrowRight, Download, FileText, CheckCircle } from 'lucide-react';

export default function HardwareSchematics() {
  const [activeTab, setActiveTab] = useState('pinout');

  const pinMappings = [
    { component: 'HLK-LD2410 mmWave Radar', modulePin: 'Tx Pin', esp32Pin: 'GPIO 16 (RX2)', function: 'UART Serial Target Frame Input', status: 'Mandatory' },
    { component: 'HLK-LD2410 mmWave Radar', modulePin: 'Rx Pin', esp32Pin: 'GPIO 17 (TX2)', function: 'UART Serial Gate Config Command', status: 'Mandatory' },
    { component: 'HLK-LD2410 mmWave Radar', modulePin: 'OUT Pin', esp32Pin: 'GPIO 15', function: 'Hardware Presence High/Low Interrupt', status: 'Optional' },
    { component: 'HLK-LD2410 mmWave Radar', modulePin: 'VCC / GND', esp32Pin: '5V / GND Rail', function: 'Power Supply (200mA peak current)', status: 'Mandatory' },
    { component: '2-Channel Relay Module', modulePin: 'IN1 (Light Relay)', esp32Pin: 'GPIO 26', function: 'Direct Active-LOW Lighting Trigger (0V ON, 3.3V OFF Cutoff)', status: 'Mandatory' },
    { component: '2-Channel Relay Module', modulePin: 'IN2 (Fan Relay)', esp32Pin: 'GPIO 27', function: 'Direct Active-LOW Fan Trigger (0V ON, 3.3V OFF Cutoff)', status: 'Mandatory' },
    { component: 'Manual Hardware Switch', modulePin: 'Push-Button / Switch', esp32Pin: 'GPIO 4 & GND', function: 'Physical Manual Override (60ms Noise Filtered)', status: 'Active' },
    { component: 'DHT22 Climate Sensor', modulePin: 'Data Pin', esp32Pin: 'GPIO 32 (Optional)', function: 'Temp & Humidity (Skipped - Not Required)', status: 'Skipped' },
    { component: 'LDR Ambient Lux Sensor', modulePin: 'AO (Analog Out)', esp32Pin: 'GPIO 34 (Optional)', function: 'Lux Sensing (Skipped - Not Required)', status: 'Skipped' },
  ];

  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Hardware Circuit & Pinout Wiring Guide</h3>
            <p className="text-xs text-slate-400">Direct connections for ESP32 + HLK-LD2410 + 2-Ch Relays (LDR & DHT22 Bypassed)</p>
          </div>
        </div>
        <span className="badge badge-cyan text-[10px]">ESP32 NodeMCU WROOM-32</span>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('pinout')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'pinout' 
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          GPIO Pinout Table
        </button>

        <button
          onClick={() => setActiveTab('schematic')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'schematic' 
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Visual Circuit Block Diagram
        </button>

        <button
          onClick={() => setActiveTab('fan-wiring')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'fan-wiring' 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Fan Wiring Diagram
        </button>

        <button
          onClick={() => setActiveTab('bom')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'bom' 
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Hardware BOM List
        </button>
      </div>

      {/* Tab 1: Pinout Table */}
      {activeTab === 'pinout' && (
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Hardware Component</th>
                <th className="py-2.5 px-3">Module Pin</th>
                <th className="py-2.5 px-3">ESP32 Pin Target</th>
                <th className="py-2.5 px-3">Signal Function</th>
                <th className="py-2.5 px-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {pinMappings.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-sans font-semibold text-white">{row.component}</td>
                  <td className="py-3 px-3 text-cyan-400">{row.modulePin}</td>
                  <td className="py-3 px-3 text-amber-400 font-bold">{row.esp32Pin}</td>
                  <td className="py-3 px-3 font-sans text-slate-300">{row.function}</td>
                  <td className="py-3 px-3">
                    <span className="badge badge-emerald text-[9px]">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Visual Circuit Diagram */}
      {activeTab === 'schematic' && (
        <div className="bg-[#090d16] p-6 rounded-xl border border-slate-800 flex flex-col items-center gap-6">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Sensor Block */}
            <div className="bg-slate-900 p-4 rounded-xl border border-cyan-500/30 flex flex-col gap-3">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-4 h-4" /> 1. Input Radar & Sensors
              </span>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="p-2 bg-slate-950 rounded border border-cyan-500/40">
                  <div className="text-white font-bold flex items-center justify-between">
                    <span>HLK-LD2410 mmWave</span>
                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold">PRIMARY</span>
                  </div>
                  <div className="text-cyan-400 text-[11px]">UART2 (GPIO 16/17) Active</div>
                </div>
                <div className="p-2 bg-slate-950/50 rounded border border-slate-800/80 opacity-50">
                  <div className="text-slate-400 font-bold line-through">DHT22 Temp Sensor</div>
                  <div className="text-slate-500 text-[10px]">Skipped / Not Required</div>
                </div>
                <div className="p-2 bg-slate-950/50 rounded border border-slate-800/80 opacity-50">
                  <div className="text-slate-400 font-bold line-through">LDR Lux Module</div>
                  <div className="text-slate-500 text-[10px]">Skipped / Not Required</div>
                </div>
              </div>
            </div>

            {/* Core ESP32 Microcontroller */}
            <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/40 flex flex-col items-center justify-center gap-3 text-center shadow-[0_0_20px_rgba(139,92,246,0.15)]">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Cpu className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm font-mono">ESP32-WROOM-32</h4>
                <p className="text-xs text-slate-400">Dual Core 240MHz 32-bit MCU</p>
                <span className="badge badge-cyan text-[10px] mt-2">FreeRTOS Engine</span>
              </div>
            </div>

            {/* Actuator Relay Block */}
            <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/30 flex flex-col gap-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> 3. Output Actuators
              </span>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-white font-bold">Relay Ch 1 (GPIO 26)</div>
                  <div className="text-cyan-400 text-[11px]">230V AC Lighting Panel</div>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-white font-bold">Relay Ch 2 (GPIO 27)</div>
                  <div className="text-amber-400 text-[11px]">230V AC Ceiling Fan Motor</div>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-white font-bold">Onboard LED (GPIO 2)</div>
                  <div className="text-cyan-400 text-[11px]">Dedicated Light Indicator</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Fan Wiring Diagram */}
      {activeTab === 'fan-wiring' && (
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-amber-400 font-mono">ESP32 Fan Automation & Relay Wiring Schematic</h4>
              <p className="text-xs text-slate-400">Wiring configuration for 230V AC Ceiling Fans and low-voltage DC PWM Fans</p>
            </div>
            <span className="badge badge-amber text-[10px]">GPIO 27 Active-LOW</span>
          </div>

          {/* Option A: 230V AC Ceiling Fan via Optocoupler Relay */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h5 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Option A: 230V AC Ceiling Fan Relay Control (ON / OFF Switching)
            </h5>
            
            {/* Visual Schematic Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
              {/* Box 1: ESP32 */}
              <div className="p-3 bg-slate-900 rounded-lg border border-purple-500/30">
                <div className="text-purple-400 font-bold mb-2">1. ESP32 Microcontroller</div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-amber-400 font-bold">GPIO 27</span> ➔ Relay IN2 Signal</p>
                  <p><span className="text-rose-400 font-bold">5V (VIN)</span> ➔ Relay VCC</p>
                  <p><span className="text-slate-400 font-bold">GND</span> ➔ Relay GND</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center text-slate-500">
                ➔ LOW Signal Trigger
              </div>

              {/* Box 2: 5V Relay Channel */}
              <div className="p-3 bg-slate-900 rounded-lg border border-cyan-500/30">
                <div className="text-cyan-400 font-bold mb-2">2. Optocoupler Relay (Ch 2)</div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-emerald-400 font-bold">COM</span> ➔ 230V AC Phase Line (Live)</p>
                  <p><span className="text-amber-400 font-bold">NO (Normally Open)</span> ➔ Regulator Input</p>
                  <p><span className="text-slate-500 text-[10px]">Optoisolated HV isolation</span></p>
                </div>
              </div>

              {/* Box 3: Fan Load */}
              <div className="p-3 bg-slate-900 rounded-lg border border-amber-500/30">
                <div className="text-amber-400 font-bold mb-2">3. Ceiling Fan Load</div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-amber-300 font-bold">Fan Wire Phase</span> ➔ Relay NO / Regulator Out</p>
                  <p><span className="text-blue-400 font-bold">Fan Neutral Wire</span> ➔ Mains Neutral (N)</p>
                  <p><span className="text-emerald-400 font-bold">Earth Ground</span> ➔ Fan Body Chassis</p>
                </div>
              </div>
            </div>

            {/* Terminal Connection Summary */}
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs">
              <h6 className="font-bold text-slate-200 mb-2 font-mono">Terminal Pin Connections:</h6>
              <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
                <li><strong className="text-cyan-300">Relay Module IN2 pin</strong> ➔ ESP32 GPIO 27 (Configured as <code className="text-amber-300">pinMode(27, OUTPUT)</code>)</li>
                <li><strong className="text-cyan-300">Relay COM (Common)</strong> ➔ Live AC mains supply wire (230V Line)</li>
                <li><strong className="text-cyan-300">Relay NO (Normally Open)</strong> ➔ Wall Fan Regulator input or directly to Fan Phase wire</li>
                <li><strong className="text-cyan-300">Direct Connection</strong> ➔ AC Neutral wire connects directly to the ceiling fan neutral terminal</li>
              </ul>
            </div>
          </div>

          {/* Option B: 12V DC Brushless Fan via Relay Channel 2 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-4 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Option B: 12V DC Fan Direct Relay Control (Recommended - Motor Driver Eliminated)
              </h5>
              <span className="badge badge-amber text-[10px] font-mono">RELAY CH 2</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Directly switch standard 12V DC 2-wire / 3-wire computer/room fans through Relay Channel 2 without voltage loss or PWM interference.
            </p>

            {/* Visual Block Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              {/* Box 1: ESP32 */}
              <div className="p-3.5 bg-slate-900 rounded-xl border border-purple-500/30 space-y-2">
                <div className="text-purple-400 font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>1. ESP32 Microcontroller</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-amber-400 font-bold">GPIO 27</span> ➔ Relay IN2 Signal</p>
                  <p><span className="text-cyan-400 font-bold">GPIO 26</span> ➔ Relay IN1 (Light)</p>
                  <p><span className="text-rose-400 font-bold">5V / VIN</span> ➔ Relay VCC</p>
                  <p><span className="text-slate-400 font-bold">GND</span> ➔ Relay GND</p>
                </div>
              </div>

              {/* Box 2: Relay Channel 2 */}
              <div className="p-3.5 bg-slate-900 rounded-xl border border-amber-500/30 space-y-2">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>2. Relay Channel 2 (Fan)</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-rose-400 font-bold">COM2</span> ➔ Ext 12V (+) Rail</p>
                  <p><span className="text-emerald-400 font-bold">NO2 (Normally Open)</span> ➔ Fan Red Wire (+)</p>
                  <p className="text-[10px] text-slate-500 pt-0.5">Optocoupler Active-LOW (0V ON, 3.3V OFF)</p>
                </div>
              </div>

              {/* Box 3: 12V Fan Load */}
              <div className="p-3.5 bg-slate-900 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Fan className="w-3.5 h-3.5" />
                  <span>3. 12V DC Fan</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-rose-400 font-bold">🔴 Red Wire (+)</span> ➔ Relay NO2</p>
                  <p><span className="text-slate-400 font-bold">⬛ Black Wire (-)</span> ➔ Ext 12V (-) GND</p>
                  <p className="text-[10px] text-emerald-400 pt-0.5 font-bold">Full 12V power with 0V transistor drop</p>
                </div>
              </div>
            </div>

            {/* Step-by-Step Connection Instructions */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5">
              <span className="font-bold text-white block">Relay Fan Wiring Steps:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Connect ESP32 <strong className="text-amber-300">GPIO 27</strong> to <strong className="text-cyan-300">IN2</strong> on your 2-channel relay module.</li>
                <li>Connect external +12V power brick wire to the <strong className="text-rose-400">COM</strong> terminal of Relay Channel 2.</li>
                <li>Connect the <strong className="text-rose-400">Red (+) wire</strong> of your DC fan to the <strong className="text-emerald-400">NO (Normally Open)</strong> terminal of Relay Channel 2.</li>
                <li>Connect the <strong className="text-slate-400">Black (-) wire</strong> of your DC fan directly to the <strong className="text-slate-400">GND (-)</strong> wire of your 12V power brick.</li>
              </ul>
            </div>
          </div>

          {/* Safety Warning Banner */}
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <div className="font-bold shrink-0 uppercase text-[10px] bg-rose-500/20 px-2 py-0.5 rounded text-rose-300 mt-0.5">WARNING</div>
            <p className="text-[11px] leading-relaxed">
              <strong>High Voltage AC Safety Caution:</strong> Mains 230V AC is lethal. Turn off the main circuit breaker before wiring AC terminals. Keep high-voltage AC mains lines physically separated from low-voltage ESP32 5V/3.3V DC logic lines.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Hardware BOM List */}
      {activeTab === 'bom' && (
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Hardware Bill of Materials (BOM) & Budget Estimate</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Purpose</th>
                  <th className="py-2 px-3">Approx Cost (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">ESP32 NodeMCU Development Board</td>
                  <td className="py-2.5 px-3">1</td>
                  <td className="py-2.5 px-3 font-sans">Main microcontroller & Wi-Fi gateway</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">₹420</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">HLK-LD2410 24GHz mmWave Radar Module</td>
                  <td className="py-2.5 px-3">1</td>
                  <td className="py-2.5 px-3 font-sans">Human presence micro-motion sensing</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">₹480</td>
                </tr>
                <tr className="opacity-60">
                  <td className="py-2.5 px-3 font-semibold text-slate-400 line-through">DHT22 Digital Climate Sensor</td>
                  <td className="py-2.5 px-3">0</td>
                  <td className="py-2.5 px-3 font-sans">Skipped (Bypassed for mmWave direct switching)</td>
                  <td className="py-2.5 px-3 text-slate-500 font-bold">₹0 (Omitted)</td>
                </tr>
                <tr className="opacity-60">
                  <td className="py-2.5 px-3 font-semibold text-slate-400 line-through">LDR Light Dependent Resistor Module</td>
                  <td className="py-2.5 px-3">0</td>
                  <td className="py-2.5 px-3 font-sans">Skipped (Bypassed for mmWave direct switching)</td>
                  <td className="py-2.5 px-3 text-slate-500 font-bold">₹0 (Omitted)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">2-Channel 5V Relay Module (Optocoupler)</td>
                  <td className="py-2.5 px-3">1</td>
                  <td className="py-2.5 px-3 font-sans">230V AC load switching for Light & Fan</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">₹110</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">5V 2A SMPS Power Supply Adapter</td>
                  <td className="py-2.5 px-3">1</td>
                  <td className="py-2.5 px-3 font-sans">Clean DC power source</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">₹150</td>
                </tr>
                <tr className="bg-slate-950 font-bold">
                  <td className="py-3 px-3 text-emerald-400 font-sans">TOTAL ACTIVE HARDWARE BUDGET</td>
                  <td className="py-3 px-3">--</td>
                  <td className="py-3 px-3 font-sans">Lean prototype (ESP32 + mmWave + Relays)</td>
                  <td className="py-3 px-3 text-emerald-400 text-sm font-bold">₹1,160 (~$14 USD)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
