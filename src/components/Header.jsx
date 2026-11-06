import { Radio, Cpu, Zap, Wifi, ShieldAlert, Sparkles, ShieldCheck, Lock, Power, PowerOff, RefreshCw, User, Database } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  isSimulating, 
  setIsSimulating, 
  presenceDetected,
  isTargetInBounds = true,
  roomTemp, 
  ambientLux, 
  lightRelay, 
  fanSpeed,
  currentUser,
  vacantCountdown = null,
  manualOverride = false,
  onManualAllOn,
  onManualAllOff,
  onResumeAuto,
  cloudSyncInfo
}) {
  const isSuperAdmin = currentUser && currentUser.role === 'super_admin';

  const tabs = [
    { id: 'dashboard', label: 'Live Control & Radar', restricted: false },
    { id: 'classroom', label: 'Classroom Spatial Map', restricted: false },
    { id: 'automation', label: 'Automation & Calibration', restricted: true },
    { id: 'analytics', label: 'Energy Analytics', restricted: false },
    { id: 'schematics', label: 'Circuit Schematics', restricted: true },
    { id: 'gateway', label: 'Web Serial Gateway', restricted: false },
    { id: 'admin', label: isSuperAdmin ? 'Super Admin Portal' : 'Admin Portal', isAdmin: true, restricted: false },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[#070a12]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Brand Title & Badges */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white font-['Outfit'] tracking-tight">
                    SmartClass <span className="text-cyan-400">mmWave</span> Automation
                  </h1>
                  <span className="badge badge-cyan text-[10px]">24GHz FMCW</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-bold flex items-center gap-1 ${
                    isSuperAdmin 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {isSuperAdmin ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <User className="w-3 h-3 text-slate-400" />}
                    <span>{isSuperAdmin ? 'SUPER ADMIN' : 'NORMAL USER'}</span>
                  </span>
                  <span 
                    title={`Firebase Firestore Live Sync: classrooms/CR-101 & energy_logs (Last synced: ${cloudSyncInfo?.lastTelemetrySync || 'Connecting...'})`}
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                  >
                    <Database className="w-2.5 h-2.5 text-cyan-400" />
                    <span>CLOUD SYNC</span>
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                  <span>ESP32 + HLK-LD2410 Sensor</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-cyan-300 font-medium">Smart Room System</span>
                </p>
              </div>
            </div>

            {/* Mode Switch Button (Mobile Only) */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  isSimulating 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                {isSimulating ? 'SIMULATION' : 'HARDWARE'}
              </button>
            </div>
          </div>

          {/* Quick Real-Time Telemetry Bar (Fixed Dimensions, Zero Layout Shift) */}
          <div className="flex items-center gap-3 bg-slate-900/60 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 shrink-0">
            
            {/* Slot 1: Presence Status */}
            <div className="flex items-center gap-2 whitespace-nowrap min-w-[125px] shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                presenceDetected && isTargetInBounds
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                  : vacantCountdown !== null 
                  ? 'bg-amber-400 animate-pulse'
                  : presenceDetected && !isTargetInBounds
                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                  : 'bg-slate-600'
              }`} />
              <span className="font-semibold text-white">
                {presenceDetected 
                  ? (isTargetInBounds ? 'OCCUPIED' : 'OUT OF BOUNDS') 
                  : 'VACANT'}
              </span>
              {manualOverride && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  MANUAL
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-slate-800 shrink-0" />

            {/* Slot 2: Light Relay */}
            <div className="flex items-center gap-1.5 whitespace-nowrap min-w-[85px] shrink-0">
              <span className="text-slate-400">Light:</span>
              <span className={`font-mono font-semibold ${lightRelay ? 'text-cyan-400' : 'text-slate-500'}`}>
                {lightRelay ? 'ON' : 'OFF'}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800 shrink-0" />

            {/* Slot 3: Fan PWM */}
            <div className="flex items-center gap-1.5 whitespace-nowrap min-w-[85px] shrink-0">
              <span className="text-slate-400">Fan:</span>
              <span className={`font-mono font-semibold tabular-nums ${fanSpeed > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {fanSpeed > 0 ? `${fanSpeed}%` : 'OFF'}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800 shrink-0" />

            {/* Quick Header Manual Switch Action */}
            <div className="flex items-center gap-1.5 shrink-0">
              {manualOverride ? (
                <div className="flex items-center gap-1">
                  {onManualAllOff && (
                    <button
                      onClick={onManualAllOff}
                      title="Turn OFF all appliances"
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all flex items-center gap-1"
                    >
                      <PowerOff className="w-3 h-3" />
                      <span>ALL OFF</span>
                    </button>
                  )}
                  {onResumeAuto && (
                    <button
                      onClick={onResumeAuto}
                      title="Resume Automated Sensor Mode"
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>AUTO</span>
                    </button>
                  )}
                </div>
              ) : (
                onManualAllOn && (
                  <button
                    onClick={onManualAllOn}
                    title="Force ON Light & Fan manually"
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/40 hover:from-emerald-500/30 hover:to-cyan-500/30 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Power className="w-3 h-3 text-emerald-400" />
                    <span>MANUAL ON</span>
                  </button>
                )
              )}
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block shrink-0" />

            {/* Slot 5: Mode Button (Fixed Width, No Jitter) */}
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`hidden lg:flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-[11px] border transition-all shrink-0 min-w-[150px] ${
                isSimulating 
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span>{isSimulating ? 'MODE: SIMULATOR' : 'MODE: HARDWARE'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-none border-t border-slate-800/60 pt-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isLocked = tab.restricted && !isSuperAdmin;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? (tab.isAdmin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]')
                    : isLocked
                    ? 'text-slate-500 hover:text-amber-300 hover:bg-slate-900/60 border border-transparent'
                    : (tab.isAdmin ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent')
                }`}
                title={isLocked ? 'Super Admin authentication required' : ''}
              >
                {tab.isAdmin && (
                  isSuperAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />
                )}
                {isLocked && <Lock className="w-3 h-3 text-amber-400/70" />}
                <span>{tab.label}</span>
                {isLocked && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400/90 border border-amber-500/20 font-mono">
                    ADMIN
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
