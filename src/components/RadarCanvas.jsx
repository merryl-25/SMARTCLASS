import React, { useEffect, useRef } from 'react';
import { Target, Shield, Activity, Maximize2 } from 'lucide-react';

export default function RadarCanvas({ 
  presenceDetected, 
  targetDistance, 
  motionType, 
  staticEnergy, 
  movingEnergy,
  gateEnergies = [15, 30, 45, 80, 25, 10, 5, 0],
  maxGate = 6
}) {
  const canvasRef = useRef(null);
  const sweepAngleRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set high pixel density
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height - 30; // Radar origin at bottom center
    const maxRadius = height - 50;

    const render = () => {
      // Clear canvas with deep dark background
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, width, height);

      // Draw radar background grid rings (Gate 1 to Gate 8)
      const numGates = 8;
      ctx.lineWidth = 1;

      for (let i = 1; i <= numGates; i++) {
        const r = (maxRadius / numGates) * i;
        ctx.strokeStyle = i <= maxGate ? 'rgba(6, 182, 212, 0.18)' : 'rgba(239, 68, 68, 0.12)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, Math.PI, 2 * Math.PI);
        ctx.stroke();

        // Gate label distance (e.g. 0.75m, 1.5m, 2.25m ... 6.0m)
        const distMeter = (i * 0.75).toFixed(2);
        ctx.fillStyle = i <= maxGate ? 'rgba(148, 163, 184, 0.4)' : 'rgba(239, 68, 68, 0.3)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`G${i} ${distMeter}m`, centerX + 6, centerY - r + 10);
      }

      // Draw FOV Cone (60 degrees total, +/- 60 deg from top center)
      const startAngle = Math.PI * 1.15; // ~ -60 degrees
      const endAngle = Math.PI * 1.85;   // ~ +60 degrees
      
      ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Cone border lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(startAngle) * maxRadius, centerY + Math.sin(startAngle) * maxRadius);
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(endAngle) * maxRadius, centerY + Math.sin(endAngle) * maxRadius);
      ctx.stroke();

      // Update sweep line angle (oscillates between -60° and +60°)
      sweepAngleRef.current += 0.025;
      const currentSweep = Math.sin(sweepAngleRef.current) * 0.55 - (Math.PI / 2);

      // Draw Radar Sweep Beam Line & Arc Trail
      const sweepX = centerX + Math.cos(currentSweep) * maxRadius;
      const sweepY = centerY + Math.sin(currentSweep) * maxRadius;

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // Draw Target if presence detected
      if (presenceDetected) {
        const targetRadius = Math.min(maxRadius, (targetDistance / 6.0) * maxRadius);
        const targetAngle = -Math.PI / 2 + Math.sin(sweepAngleRef.current * 0.7) * 0.25;

        const tx = centerX + Math.cos(targetAngle) * targetRadius;
        const ty = centerY + Math.sin(targetAngle) * targetRadius;

        // Color based directly on static vs moving
        const isStatic = motionType === 'static';
        const targetColor = isStatic ? '#f59e0b' : '#10b981';

        // Check if target distance is beyond active radar gate range
        const maxDistance = (maxGate || 6) * 0.75;
        const isCutoff = targetDistance > maxDistance;

        // Draw Target Pulse Rings
        ctx.fillStyle = targetColor;
        ctx.beginPath();
        ctx.arc(tx, ty, 8, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = isCutoff 
          ? 'rgba(6, 182, 212, 0.4)' 
          : isStatic 
          ? 'rgba(245, 158, 11, 0.4)' 
          : 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tx, ty, 16 + Math.sin(Date.now() / 150) * 4, 0, 2 * Math.PI);
        ctx.stroke();

        // Distance Tag Text Box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = targetColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(tx + 12, ty - 18, isCutoff ? 120 : 100, 26, 6);
        } else {
          ctx.rect(tx + 12, ty - 18, isCutoff ? 120 : 100, 26);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px JetBrains Mono, monospace';
        const statusLabel = isCutoff ? 'Out of Range' : isStatic ? 'Breathing' : 'Moving';
        ctx.fillText(`${targetDistance.toFixed(2)}m (${statusLabel})`, tx + 16, ty - 2);
      }

      // Draw Sensor Center Hub
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [presenceDetected, targetDistance, motionType, maxGate]);

  return (
    <div className="glass-panel p-5 relative overflow-hidden flex flex-col items-center">
      {/* Visualizer Title Bar */}
      <div className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white text-sm">24GHz FMCW Radar Sweep Visualizer</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            LD2410 8-Gate Scanner
          </span>
        </div>
      </div>

      {/* Canvas Frame */}
      <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-[#0a0e17] shadow-inner">
        <canvas 
          ref={canvasRef} 
          width={460} 
          height={290}
          className="block"
        />
        
        {/* Overlaid Legend */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md p-2 rounded-lg border border-slate-800 text-[11px] flex flex-col gap-1 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Moving Target (Walking/Gestures)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Micro-Motion Target (Static Breathing/Reading)</span>
          </div>
        </div>
      </div>

      {/* 8-Gate Energy Breakdown Histogram */}
      <div className="w-full mt-4 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Radar Gate Distance Levels (G1{maxGate > 1 ? `-G${maxGate}` : ''} Active | {maxGate < 8 ? `G${maxGate + 1}-G8 Inactive` : 'All Active'})
          </span>
          <span className="text-[11px] font-mono text-cyan-400">
            Moving Energy: {movingEnergy}% | Static: {staticEnergy}%
          </span>
        </div>

        <div className="grid grid-cols-8 gap-1.5">
          {gateEnergies.map((val, idx) => {
            const gateNum = idx + 1;
            const isGateActive = gateNum <= maxGate;
            const targetGateIdx = Math.floor((targetDistance / 6.0) * 8);
            const isTargetGate = isGateActive && presenceDetected && (targetGateIdx === idx);

            return (
              <div 
                key={idx} 
                className={`flex flex-col items-center gap-1 transition-all ${
                  !isGateActive ? 'opacity-35' : ''
                }`}
              >
                <div className={`w-full h-16 rounded-md p-1 flex flex-col justify-end border transition-all ${
                  !isGateActive 
                    ? 'bg-slate-950/90 border-slate-800/50 border-dashed' 
                    : isTargetGate 
                    ? 'bg-slate-900/90 border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900/80 border-cyan-500/30'
                }`}>
                  {isGateActive ? (
                    <div 
                      className={`w-full rounded transition-all duration-300 ${
                        isTargetGate 
                          ? (motionType === 'static' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]') 
                          : 'bg-cyan-500/40'
                      }`}
                      style={{ height: `${Math.max(5, val)}%` }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[8px] font-mono font-bold text-slate-600 uppercase tracking-tighter">OFF</span>
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-mono font-bold ${
                  isGateActive ? (isTargetGate ? 'text-emerald-400' : 'text-cyan-300') : 'text-slate-600'
                }`}>
                  G{gateNum}
                </span>
                <span className={`text-[9px] font-mono ${isGateActive ? 'text-slate-400' : 'text-slate-600'}`}>
                  {((gateNum)*0.75).toFixed(1)}m
                </span>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-semibold ${
                  isGateActive ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/50' : 'bg-slate-900 text-slate-600'
                }`}>
                  {isGateActive ? 'ACTIVE' : 'CUT'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
