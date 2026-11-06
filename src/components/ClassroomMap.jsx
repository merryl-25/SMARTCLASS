import React from 'react';
import { 
  Layout, Fan, Lightbulb, Radio, User, Monitor, 
  Sparkles, CheckCircle2, Shield, Activity, Target, Compass
} from 'lucide-react';

export default function ClassroomMap({ 
  presenceDetected = false, 
  targetDistance = 0, 
  motionType = 'none', 
  lightRelay = false, 
  fanSpeed = 0, 
  fanLevel = 0 
}) {
  // Determine fan animation speed class for 4 speeds
  let fanAnimClass = '';
  if (fanSpeed >= 85 || fanLevel === 3) fanAnimClass = 'animate-spin-fast';
  else if (fanSpeed >= 50 || fanLevel === 2) fanAnimClass = 'animate-spin-med';
  else if (fanSpeed > 0 || fanLevel === 1) fanAnimClass = 'animate-spin-slow';

  // Compute active range gate from targetDistance (0.75 meters per gate)
  // Distance 0.00m - 0.75m = Gate 1
  // Distance 0.75m - 1.50m = Gate 2
  // Distance 1.50m - 2.25m = Gate 3
  // Distance 2.25m - 3.00m = Gate 4
  // Distance 3.00m - 3.75m = Gate 5
  // Distance 3.75m - 4.50m = Gate 6
  // Distance 4.50m - 5.25m = Gate 7
  // Distance 5.25m - 6.00m = Gate 8
  const activeGate = Math.min(8, Math.max(1, Math.ceil(targetDistance / 0.75) || 1));

  // Determine active seating row based on exact requirements:
  // Gate 1 & 2 -> Row 1
  // Gate 3 & 4 -> Row 2
  // Gate 5 & 6 -> Row 3
  // Gate 7 & 8 -> Row 4
  let activeRow = null;
  if (presenceDetected && targetDistance > 0.05) {
    if (activeGate <= 2) {
      activeRow = 1;
    } else if (activeGate <= 4) {
      activeRow = 2;
    } else if (activeGate <= 6) {
      activeRow = 3;
    } else {
      activeRow = 4;
    }
  }

  // 4 Rows x 3 Columns Seating Matrix
  const rows = [
    {
      rowNumber: 1,
      gates: 'Gate 1 & 2',
      gateRange: '0.00m – 1.50m',
      title: 'Row 1 (Front Row)',
      tables: [
        { id: '1A', label: 'Desk 1-A', col: 'Left' },
        { id: '1B', label: 'Desk 1-B', col: 'Center' },
        { id: '1C', label: 'Desk 1-C', col: 'Right' },
      ]
    },
    {
      rowNumber: 2,
      gates: 'Gate 3 & 4',
      gateRange: '1.50m – 3.00m',
      title: 'Row 2 (Middle-Front)',
      tables: [
        { id: '2A', label: 'Desk 2-A', col: 'Left' },
        { id: '2B', label: 'Desk 2-B', col: 'Center' },
        { id: '2C', label: 'Desk 2-C', col: 'Right' },
      ]
    },
    {
      rowNumber: 3,
      gates: 'Gate 5 & 6',
      gateRange: '3.00m – 4.50m',
      title: 'Row 3 (Middle-Rear)',
      tables: [
        { id: '3A', label: 'Desk 3-A', col: 'Left' },
        { id: '3B', label: 'Desk 3-B', col: 'Center' },
        { id: '3C', label: 'Desk 3-C', col: 'Right' },
      ]
    },
    {
      rowNumber: 4,
      gates: 'Gate 7 & 8',
      gateRange: '4.50m – 6.00m',
      title: 'Row 4 (Back Row)',
      tables: [
        { id: '4A', label: 'Desk 4-A', col: 'Left' },
        { id: '4B', label: 'Desk 4-B', col: 'Center' },
        { id: '4C', label: 'Desk 4-C', col: 'Right' },
      ]
    },
  ];

  return (
    <div className="glass-panel p-5 relative overflow-hidden flex flex-col gap-4">
      
      {/* 1. Header Bar: Spatial Map Overview & Active Zone Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-base font-['Outfit']">
                Smart Classroom Spatial Twin
              </h3>
              <span className="badge badge-cyan text-[10px] font-mono">
                4 ROWS × 3 COLUMNS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              24GHz FMCW Range-Gate Spatial Mapping • 12 Student Desks
            </p>
          </div>
        </div>

        {/* Live Tracking Indicator Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Row Pill */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
            activeRow !== null 
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${activeRow !== null ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
            <span className="font-bold">
              {activeRow !== null ? `ACTIVE: ROW ${activeRow} (GATE ${activeGate})` : 'CLASSROOM VACANT'}
            </span>
          </div>

          {/* Target Distance Pill */}
          <div className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>DIST: <strong className="text-white">{targetDistance.toFixed(2)}m</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Gate-to-Row Quick Legend Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className={`p-2 rounded-xl border text-center transition-all ${
          activeRow === 1 
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold scale-[1.02]' 
            : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
        }`}>
          <div className="flex items-center justify-center gap-1 text-[11px]">
            {activeRow === 1 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <span>ROW 1</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Gate 1 & 2 (0 – 1.5m)</div>
        </div>

        <div className={`p-2 rounded-xl border text-center transition-all ${
          activeRow === 2 
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold scale-[1.02]' 
            : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
        }`}>
          <div className="flex items-center justify-center gap-1 text-[11px]">
            {activeRow === 2 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <span>ROW 2</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Gate 3 & 4 (1.5 – 3.0m)</div>
        </div>

        <div className={`p-2 rounded-xl border text-center transition-all ${
          activeRow === 3 
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold scale-[1.02]' 
            : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
        }`}>
          <div className="flex items-center justify-center gap-1 text-[11px]">
            {activeRow === 3 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <span>ROW 3</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Gate 5 & 6 (3.0 – 4.5m)</div>
        </div>

        <div className={`p-2 rounded-xl border text-center transition-all ${
          activeRow === 4 
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold scale-[1.02]' 
            : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
        }`}>
          <div className="flex items-center justify-center gap-1 text-[11px]">
            {activeRow === 4 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <span>ROW 4</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Gate 7 & 8 (4.5 – 6.0m)</div>
        </div>
      </div>

      {/* 3. Main 2D Spatial Floor Plan Arena */}
      <div className="relative w-full bg-[#070b14] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-5 overflow-hidden">
        
        {/* Subtle Room Grid Lines */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* TOP WALL: Front of Classroom (Board, Ceiling mmWave Radar, LED Light Panel A) */}
        <div className="relative z-10 w-full flex items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          
          {/* Interactive Smartboard */}
          <div className="w-44 sm:w-56 h-10 bg-slate-900/90 border border-slate-700/80 rounded-xl flex items-center justify-center text-xs font-semibold text-slate-200 gap-2 shadow-lg">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span className="font-['Outfit'] tracking-wide">Interactive Smartboard</span>
          </div>

          {/* Central Ceiling Radar Hub with Animated Radar Wave Pulses */}
          <div className="relative flex flex-col items-center">
            <div className="px-3.5 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 text-xs font-mono">
              <Radio className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span className="font-bold">HLK-LD2410 Radar Node</span>
            </div>

            {/* Downward Radar Scan Cone Beam */}
            {presenceDetected && (
              <div 
                className="absolute top-9 w-72 h-44 bg-gradient-to-b from-cyan-500/15 via-cyan-500/5 to-transparent pointer-events-none animate-pulse"
                style={{
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                }}
              />
            )}
          </div>

          {/* Smart LED Light Panel 1 */}
          <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
            lightRelay 
              ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]' 
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}>
            <Lightbulb className={`w-4 h-4 ${lightRelay ? 'text-amber-300 animate-pulse' : 'text-slate-600'}`} />
            <span className="font-mono">LED Panel 1: {lightRelay ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        {/* MIDDLE SECTION: Flanked by Ceiling Fans with the 4x3 Table Grid in the Center */}
        <div className="relative z-10 w-full flex items-center justify-between gap-4">
          
          {/* Left Wall: Ceiling Fan 1 */}
          <div className="hidden md:flex flex-col items-center gap-2 shrink-0 w-24">
            <div className={`p-4 rounded-2xl border bg-slate-900/90 transition-all ${
              fanSpeed > 0 
                ? 'border-amber-400 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                : 'border-slate-800 text-slate-600'
            }`}>
              <Fan className={`w-9 h-9 ${fanAnimClass}`} />
            </div>
            <div className="text-center font-mono">
              <span className="text-[11px] font-bold text-slate-200 block">Ceiling Fan 1</span>
              <span className="text-[10px] text-amber-400">
                {fanSpeed > 0 ? `L${fanLevel} • ${fanSpeed}%` : 'OFF'}
              </span>
            </div>
          </div>

          {/* CENTER ARENA: 4 ROWS × 3 COLUMNS (12 TABLES) */}
          <div className="flex-1 space-y-3.5">
            {rows.map((row) => {
              const isRowOccupied = activeRow === row.rowNumber;

              return (
                <div 
                  key={row.rowNumber}
                  className={`relative p-3 rounded-2xl border transition-all duration-500 ${
                    isRowOccupied 
                      ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/25 to-emerald-500/15 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/50' 
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  {/* Row Header Label */}
                  <div className="flex items-center justify-between text-xs font-mono mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isRowOccupied ? 'bg-emerald-400 animate-ping' : 'bg-slate-700'}`} />
                      <span className={`font-bold ${isRowOccupied ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {row.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                        isRowOccupied 
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60 shadow-sm' 
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        {row.gates} ({row.gateRange})
                      </span>

                      {isRowOccupied && (
                        <span className="badge badge-emerald text-[9px] font-bold tracking-wider animate-pulse">
                          OCCUPIED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3 Columns of Tables for this Row */}
                  <div className="grid grid-cols-3 gap-3">
                    {row.tables.map((table) => {
                      // Place the active student avatar on the center desk (Col 2) or show presence in this row
                      const isOccupantHere = isRowOccupied && table.col === 'Center';

                      return (
                        <div 
                          key={table.id}
                          className={`relative h-20 rounded-xl p-2 flex flex-col justify-between items-center transition-all ${
                            isOccupantHere 
                              ? 'bg-slate-900/95 border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.4)]' 
                              : isRowOccupied
                              ? 'bg-slate-900/80 border border-emerald-500/40 text-slate-300'
                              : 'bg-slate-900/60 border border-slate-800/90 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          {/* Student Chairs (Top Pair of Chairs) */}
                          <div className="flex justify-between w-full px-2 -mt-3.5 pointer-events-none">
                            <span className={`w-4 h-2 rounded-t-sm border ${
                              isOccupantHere ? 'bg-emerald-500/30 border-emerald-400' : 'bg-slate-800 border-slate-700'
                            }`} />
                            <span className={`w-4 h-2 rounded-t-sm border ${
                              isOccupantHere ? 'bg-emerald-500/30 border-emerald-400' : 'bg-slate-800 border-slate-700'
                            }`} />
                          </div>

                          {/* Table Center Content */}
                          {isOccupantHere ? (
                            <div className="flex flex-col items-center justify-center my-auto">
                              <div className={`p-1.5 rounded-full border shadow-md flex items-center justify-center ${
                                motionType === 'static' 
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                                  : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-bounce'
                              }`}>
                                <User className="w-4 h-4" />
                              </div>
                              <span className="text-[9px] font-mono font-bold text-emerald-300 mt-0.5 tracking-tight">
                                {motionType === 'static' ? 'Seated (Breathing)' : 'Active (Moving)'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center my-auto text-center">
                              <div className="w-8 h-1.5 bg-slate-800 rounded-full mb-1 opacity-60" />
                              <span className="font-mono text-[10px] text-slate-400 font-semibold">
                                {table.label}
                              </span>
                            </div>
                          )}

                          {/* Table Bottom Identifier Badge */}
                          <div className="w-full flex items-center justify-between px-1 text-[9px] font-mono text-slate-500">
                            <span>Col: {table.col}</span>
                            <span className={isOccupantHere ? 'text-emerald-400 font-bold' : ''}>
                              {table.id}
                            </span>
                          </div>

                          {/* Student Chairs (Bottom Pair of Chairs) */}
                          <div className="flex justify-between w-full px-2 -mb-3.5 pointer-events-none">
                            <span className={`w-4 h-2 rounded-b-sm border ${
                              isOccupantHere ? 'bg-emerald-500/30 border-emerald-400' : 'bg-slate-800 border-slate-700'
                            }`} />
                            <span className={`w-4 h-2 rounded-b-sm border ${
                              isOccupantHere ? 'bg-emerald-500/30 border-emerald-400' : 'bg-slate-800 border-slate-700'
                            }`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Wall: Ceiling Fan 2 */}
          <div className="hidden md:flex flex-col items-center gap-2 shrink-0 w-24">
            <div className={`p-4 rounded-2xl border bg-slate-900/90 transition-all ${
              fanSpeed > 0 
                ? 'border-amber-400 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                : 'border-slate-800 text-slate-600'
            }`}>
              <Fan className={`w-9 h-9 ${fanAnimClass}`} />
            </div>
            <div className="text-center font-mono">
              <span className="text-[11px] font-bold text-slate-200 block">Ceiling Fan 2</span>
              <span className="text-[10px] text-amber-400">
                {fanSpeed > 0 ? `L${fanLevel} • ${fanSpeed}%` : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM WALL: Rear of Classroom (LED Light Panel 2 & Spatial Coverage Info) */}
        <div className="relative z-10 w-full flex items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Classroom Dimensions: <strong>8.0m × 6.0m</strong></span>
            <span className="text-slate-600">•</span>
            <span className="hidden sm:inline">24GHz mmWave Spatial Field (8 Gates)</span>
          </div>

          {/* Smart LED Light Panel 2 */}
          <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
            lightRelay 
              ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]' 
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}>
            <Lightbulb className={`w-4 h-4 ${lightRelay ? 'text-amber-300 animate-pulse' : 'text-slate-600'}`} />
            <span className="font-mono">LED Panel 2: {lightRelay ? 'ON' : 'OFF'}</span>
          </div>
        </div>

      </div>

      {/* 4. Pedagogical Explanatory Footnote for Teachers */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>FMCW Range Gate Correlation:</strong> Each gate measures 0.75m. 
            Row 1 (G1-G2: 0-1.5m) • Row 2 (G3-G4: 1.5-3.0m) • Row 3 (G5-G6: 3.0-4.5m) • Row 4 (G7-G8: 4.5-6.0m).
          </span>
        </div>
        <div className="text-emerald-400 font-bold shrink-0">
          {activeRow ? `Current Detection: Row ${activeRow}` : 'No Occupant in Range'}
        </div>
      </div>

    </div>
  );
}
