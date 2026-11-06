import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, TrendingDown, DollarSign, Leaf, BarChart3, Clock, 
  Building2, Sparkles, SlidersHorizontal, CheckCircle2, Database,
  RotateCcw, Play, Activity, ShieldCheck, Lightbulb, Fan
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  PointElement, LineElement, BarController, LineController,
  Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, 
  BarController, LineController,
  Title, Tooltip, Legend, Filler
);

export default function EnergyAnalytics({ 
  lightRelay = true, 
  fanSpeed = 100, 
  presenceDetected = true,
  targetDistance = 2.15,
  isSimulating = true,
  todayUsage = null,
  setTodayUsage,
  cloudSyncInfo
}) {
  // Chart View Toggle ('monthly' | 'daily')
  const [chartView, setChartView] = useState('daily');
  // Daily Hourly Metric: 'minutes' (Active Minutes ON) | 'energy' (Watt-hours Wh) | 'watts' (Instantaneous Load W)
  const [dailyMetric, setDailyMetric] = useState('minutes');
  // Daily Chart Style: 'bar' (Hourly Columns - recommended for interval bins) | 'line' (Smooth trend)
  const [dailyChartType, setDailyChartType] = useState('bar');

  // Load Parameters (Institutional defaults: 4x 36W LED = 144W, 2x 75W Fan = 150W)
  const lightWattage = 144;
  const fanWattage = 150;
  const totalNominalWatts = lightWattage + fanWattage; // 294W

  // Interactive Campus Sliders
  const [classroomCount, setClassroomCount] = useState(20);
  const [tariffRate, setTariffRate] = useState(8.0); // ₹8.00 / kWh

  // Soft-Sensing Virtual Current Meter
  const activeLightWatts = lightRelay ? lightWattage : 0;
  const activeFanWatts = fanSpeed > 0 ? fanWattage : 0;
  const currentTotalWatts = activeLightWatts + activeFanWatts;

  // Live Duty-Cycle Session Accumulator
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionSensorWh, setSessionSensorWh] = useState(0);
  const [sessionManualWh, setSessionManualWh] = useState(0);

  // Real-time session ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
      setSessionSensorWh((prev) => prev + (currentTotalWatts / 3600));
      setSessionManualWh((prev) => prev + (totalNominalWatts / 3600));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTotalWatts, totalNominalWatts]);

  const sessionWhSaved = Math.max(0, sessionManualWh - sessionSensorWh);

  // Helper to format raw seconds into human-readable duration
  const formatDuration = (sec = 0) => {
    const s = Math.round(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const remS = s % 60;
    if (h > 0) return `${h}h ${m}m ${remS}s`;
    if (m > 0) return `${m}m ${remS}s`;
    return `${remS}s`;
  };

  // Resolve today's live persisted usage from props or localStorage fallback
  const todayKey = new Date().toISOString().slice(0, 10);
  const resolvedUsage = useMemo(() => {
    if (todayUsage && typeof todayUsage === 'object') return todayUsage;
    try {
      const s = localStorage.getItem(`smartclass_usage_${todayKey}`);
      return s ? JSON.parse(s) : { activeSec: 0, vacantSec: 0, hourly: {} };
    } catch {
      return { activeSec: 0, vacantSec: 0, hourly: {} };
    }
  }, [todayUsage, todayKey]);

  const todayActiveSec = resolvedUsage?.activeSec || 0;
  const todayVacantSec = resolvedUsage?.vacantSec || 0;
  const totalRecordedSec = todayActiveSec + todayVacantSec;

  const todayWhConsumed = (todayActiveSec * totalNominalWatts) / 3600;
  const todayWhSaved = (todayVacantSec * totalNominalWatts) / 3600;
  const todayKwhSaved = todayWhSaved / 1000;
  const todayCostSavedINR = todayKwhSaved * tariffRate;

  // Real-time dynamic savings reduction rate
  const dynamicReductionPercent = totalRecordedSec > 10 
    ? Math.min(85, Math.max(20, (todayVacantSec / totalRecordedSec) * 100))
    : 45.0;

  // --- ACADEMIC MACRO METRICS (PER CLASSROOM) ---
  const totalKw = totalNominalWatts / 1000; // 0.294 kW
  const dailyManualKwh = totalKw * 10.0;   // 2.94 kWh/day legacy baseline
  const dailySensorKwh = totalKw * (10.0 * (1 - (dynamicReductionPercent / 100)));
  const dailySavedKwh = Math.max(0, dailyManualKwh - dailySensorKwh);
  
  const monthlyManualKwh = dailyManualKwh * 22; // 22 working days/mo
  const monthlySensorKwh = dailySensorKwh * 22;
  const monthlySavedKwh = dailySavedKwh * 22;

  const monthlyBillSavingsPerRoom = monthlySavedKwh * tariffRate;
  const annualCampusSavings = monthlyBillSavingsPerRoom * 12 * classroomCount;
  const annualCampusKwhSaved = monthlySavedKwh * 12 * classroomCount;
  const annualCampusCo2Tons = (annualCampusKwhSaved * 0.82) / 1000;

  // --- DYNAMIC HOURLY TIMELINE ---
  // Default academic schedule is 8 AM to 8 PM (hours 8 to 20).
  // If user opens the app before 8 AM or after 8 PM, dynamically include current hour!
  const currentHour = new Date().getHours();
  
  const hourIndices = useMemo(() => {
    let start = 8;
    let end = 20;
    if (currentHour < start) start = Math.max(0, currentHour);
    if (currentHour > end) end = Math.min(23, currentHour);

    const list = [];
    for (let h = start; h <= end; h++) {
      list.push(h);
    }
    return list;
  }, [currentHour]);

  const hourlyLabels = useMemo(() => {
    return hourIndices.map((h) => `${h < 10 ? '0' : ''}${h}:00`);
  }, [hourIndices]);

  // Summary of hours when sensor detected presence today
  const activeHourSummary = useMemo(() => {
    return hourIndices
      .map((h, idx) => {
        const aSec = resolvedUsage?.hourly?.[h]?.activeSec || 0;
        if (aSec === 0) return null;
        return {
          hour: h,
          label: hourlyLabels[idx],
          activeSec: aSec,
          duration: formatDuration(aSec),
          isCurrent: h === currentHour
        };
      })
      .filter(Boolean);
  }, [hourIndices, hourlyLabels, resolvedUsage, currentHour]);

  // Compute live curve for each hour based on selected dailyMetric
  const todayLiveSensorCurve = useMemo(() => {
    return hourIndices.map((h) => {
      // Future hours that haven't occurred yet are null (prevents drawing artificial slopes into future)
      if (h > currentHour) return null;

      const hData = resolvedUsage?.hourly?.[h];
      const aSec = hData?.activeSec || 0;

      // When sensor was not active in that hour -> 0
      if (aSec === 0) return 0;

      if (dailyMetric === 'minutes') {
        // Return active minutes with 2-decimal precision for live fluidity
        return parseFloat((aSec / 60).toFixed(2));
      } else if (dailyMetric === 'energy') {
        // Return actual Watt-hours (Wh) consumed in that hour
        return parseFloat(((aSec * totalNominalWatts) / 3600).toFixed(1));
      } else {
        // In Watts mode: instantaneous load if current hour, or weighted average load
        if (h === currentHour) {
          return currentTotalWatts;
        }
        return totalNominalWatts;
      }
    });
  }, [hourIndices, resolvedUsage, dailyMetric, currentHour, currentTotalWatts, totalNominalWatts]);

  // Manual Continuous Baseline comparison curve
  const hourlyManualCurve = useMemo(() => {
    return hourIndices.map((h) => {
      // Future hours are null
      if (h > currentHour) return null;
      if (dailyMetric === 'minutes') return 60; // 60 min continuous
      if (dailyMetric === 'energy') return totalNominalWatts; // 294 Wh per hour
      return totalNominalWatts; // 294W continuous
    });
  }, [hourIndices, dailyMetric, totalNominalWatts, currentHour]);

  // Peak active minutes in dataset for intelligent dynamic chart Y-axis scaling
  const maxActiveMinutesInPlot = useMemo(() => {
    if (dailyMetric !== 'minutes') return 60;
    const numericValues = todayLiveSensorCurve.filter((v) => typeof v === 'number' && !isNaN(v));
    const peak = numericValues.length > 0 ? Math.max(...numericValues, 0) : 0;
    if (peak <= 5) return 5;
    if (peak <= 15) return 15;
    if (peak <= 30) return 30;
    return 60;
  }, [dailyMetric, todayLiveSensorCurve]);

  // --- CHART DATA: 1. MONTHLY VIEW ---
  const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const monthWeights = [0.95, 0.98, 1.02, 1.05, 1.08, 1.04];

  const monthlyChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Manual Switches (Legacy Baseline)',
        data: monthWeights.map((w) => Math.round(monthlyManualKwh * w)),
        backgroundColor: 'rgba(239, 68, 68, 0.55)',
        borderColor: '#ef4444',
        borderWidth: 1.5,
        borderRadius: 6,
      },
      {
        label: '24GHz mmWave Automated Classroom',
        data: monthWeights.map((w) => Math.round(monthlySensorKwh * w)),
        backgroundColor: 'rgba(6, 182, 212, 0.75)',
        borderColor: '#06b6d4',
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  // --- CHART DATA: 2. DAILY HOURLY VIEW ---
  const hourlyChartData = {
    labels: hourlyLabels,
    datasets: [
      {
        label: dailyMetric === 'minutes' 
          ? 'Manual Switches (Continuous ON: 60 min/hr)' 
          : dailyMetric === 'energy' 
          ? 'Manual Switches (Continuous ON: 294 Wh/hr)' 
          : 'Manual Switches (Continuous Load: 294W)',
        data: hourlyManualCurve,
        borderColor: '#f87171',
        backgroundColor: dailyChartType === 'bar' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.04)',
        borderWidth: 1.5,
        borderRadius: dailyChartType === 'bar' ? 4 : 0,
        borderDash: dailyChartType === 'bar' ? undefined : [5, 4],
        fill: dailyChartType === 'line' ? false : undefined,
        tension: 0.1,
        pointRadius: 2,
        spanGaps: false,
      },
      {
        label: dailyMetric === 'minutes' 
          ? 'mmWave Sensor (Live Active Minutes ON)' 
          : dailyMetric === 'energy' 
          ? 'mmWave Sensor (Live Energy Consumed Wh)' 
          : 'mmWave Sensor (Actual Active Load W)',
        data: todayLiveSensorCurve,
        borderColor: '#10b981',
        backgroundColor: dailyChartType === 'bar' ? 'rgba(16, 185, 129, 0.75)' : 'rgba(16, 185, 129, 0.22)',
        borderWidth: 2,
        borderRadius: dailyChartType === 'bar' ? 6 : 0,
        fill: dailyChartType === 'line',
        tension: 0.2,
        spanGaps: false,
        pointRadius: (ctx) => {
          const val = ctx.dataset.data[ctx.dataIndex];
          const h = hourIndices[ctx.dataIndex];
          if (h === currentHour && presenceDetected) return 7;
          return val > 0 ? 5 : 2;
        },
        pointBackgroundColor: (ctx) => {
          const val = ctx.dataset.data[ctx.dataIndex];
          const h = hourIndices[ctx.dataIndex];
          if (h === currentHour && presenceDetected) return '#34d399';
          return val > 0 ? '#10b981' : '#334155';
        },
        pointBorderColor: (ctx) => {
          const val = ctx.dataset.data[ctx.dataIndex];
          return val > 0 ? '#ffffff' : '#1e293b';
        },
        pointBorderWidth: (ctx) => {
          const val = ctx.dataset.data[ctx.dataIndex];
          return val > 0 ? 2 : 1;
        },
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 400
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11, weight: '500' },
          boxWidth: 12,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#090d16',
        borderColor: '#1e293b',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const item = items[0];
            if (chartView === 'monthly') return `Month: ${item.label}`;
            const h = hourIndices[item.dataIndex];
            const isCurrent = h === currentHour;
            return `${item.label} (Hour ${h}:00 - ${h + 1}:00)${isCurrent ? ' • [CURRENT LIVE HOUR]' : ''}`;
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            if (chartView === 'monthly') return `${label}: ${val} kWh`;

            const h = hourIndices[context.dataIndex];
            const aSec = resolvedUsage?.hourly?.[h]?.activeSec || 0;

            if (label.includes('Manual')) {
              if (dailyMetric === 'minutes') return 'Manual Switches: 60 min ON (Continuous)';
              if (dailyMetric === 'energy') return 'Manual Switches: 294 Wh Consumed';
              return 'Manual Switches: 294W (Continuous Load)';
            }

            if (aSec > 0) {
              const aMin = Math.floor(aSec / 60);
              const aS = aSec % 60;
              const wh = ((aSec * totalNominalWatts) / 3600).toFixed(1);
              return [
                `🟢 SENSOR ON: ${aMin}m ${aS}s active in this hour`,
                dailyMetric === 'minutes' ? `⚡ Active Load: 294W (${wh} Wh consumed)` :
                dailyMetric === 'energy' ? `⚡ Energy Consumed: ${val} Wh` :
                `⚡ Live Active Load: ${val}W`
              ];
            } else {
              return `⚪ Sensor Was Standby: 0 min (0W Standby - Vacant)`;
            }
          },
          afterBody: (items) => {
            if (chartView !== 'daily' || !items.length) return [];
            const item = items[0];
            const h = hourIndices[item.dataIndex];
            if (h === currentHour) {
              return [
                `\n📡 Live Sensor State: ${presenceDetected ? 'TARGET DETECTED (TIMER ACCUMULATING)' : 'VACANT (AUTO-STANDBY)'}`,
                `⚡ Instantaneous Classroom Load: ${currentTotalWatts}W (Lights: ${activeLightWatts}W | Fans: ${activeFanWatts}W)`
              ];
            }
            return [];
          }
        }
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { family: 'monospace', size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { 
          color: '#64748b', 
          font: { family: 'monospace', size: 10 },
          callback: (val) => {
            if (chartView === 'monthly') return `${val} kWh`;
            if (dailyMetric === 'minutes') return `${val}m`;
            if (dailyMetric === 'energy') return `${val} Wh`;
            return `${val}W`;
          }
        },
        min: 0,
        max: (chartView === 'daily' && dailyMetric === 'minutes') ? maxActiveMinutesInPlot : undefined,
      },
    },
  };

  // --- ACTIONS: SAMPLE DATA SEEDER & RESET TOOL ---
  const handleLoadAcademicSampleData = () => {
    const today = new Date().toISOString().slice(0, 10);
    // Typical university timetable periods: 9 AM (50m), 10 AM (45m), 11 AM (55m), 12 PM (10m - Lunch), 14 PM (50m - Lab)
    const mockHourly = {};
    const sampleSchedule = {
      8: 15 * 60,   // 8:00 AM Prep: 15 min
      9: 50 * 60,   // Period 1: 50 min
      10: 45 * 60,  // Period 2: 45 min
      11: 52 * 60,  // Period 3: 52 min
      12: 8 * 60,   // Lunch Break: 8 min
      13: 40 * 60,  // Period 4: 40 min
      14: 48 * 60,  // Period 5: 48 min
      15: 35 * 60,  // Tutorial: 35 min
      16: 12 * 60   // Doubt Session: 12 min
    };

    let totalActive = 0;
    let totalVacant = 0;

    for (const h of hourIndices) {
      const scheduledActive = sampleSchedule[h] || 0;
      const scheduledVacant = 3600 - scheduledActive;
      mockHourly[h] = {
        activeSec: scheduledActive,
        vacantSec: scheduledVacant
      };
      totalActive += scheduledActive;
      totalVacant += scheduledVacant;
    }

    const payload = {
      activeSec: totalActive,
      vacantSec: totalVacant,
      hourly: mockHourly
    };

    try {
      localStorage.setItem(`smartclass_usage_${today}`, JSON.stringify(payload));
    } catch (e) {}

    if (setTodayUsage) {
      setTodayUsage(payload);
    }
  };

  const handleResetTodayUsage = () => {
    const today = new Date().toISOString().slice(0, 10);
    const clean = { activeSec: 0, vacantSec: 0, hourly: {} };
    try {
      localStorage.setItem(`smartclass_usage_${today}`, JSON.stringify(clean));
    } catch (e) {}
    if (setTodayUsage) {
      setTodayUsage(clean);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* 1. Header Bar: Minimal & Clean */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-base font-['Outfit']">Energy Analytics</h3>
              <span className="badge badge-emerald text-[10px] font-mono">
                {dynamicReductionPercent.toFixed(1)}% SAVINGS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Manual Baseline vs. 24GHz mmWave Intelligent Automation
            </p>
          </div>
        </div>

        {/* Live Hardware Connection & Power Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hardware Source Badge */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 ${
            !isSimulating 
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${!isSimulating ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-semibold">
              {!isSimulating ? `LIVE RADAR (${targetDistance.toFixed(2)}m)` : 'DEMO SIMULATOR'}
            </span>
          </div>

          {/* Live Power Draw Pill */}
          <div className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono transition-all ${
            currentTotalWatts > 0 
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${currentTotalWatts > 0 ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
            <span className="font-semibold">
              {currentTotalWatts > 0 ? `ACTIVE: ${currentTotalWatts}W` : 'STANDBY: 0W'}
            </span>
          </div>

          {/* Cloud Firestore Energy Log Sync Pill */}
          <div 
            title={`Synced with Firestore collection: energy_logs (Last sync: ${cloudSyncInfo?.lastEnergySync || 'Active'})`}
            className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-mono flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>CLOUD SYNC: {cloudSyncInfo?.lastEnergySync ? 'ONLINE' : 'ACTIVE'}</span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row (4 Responsive Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Energy Reduction % */}
        <div className="glass-panel p-4 flex items-center justify-between border-slate-800 hover:border-emerald-500/30 transition-all">
          <div>
            <span className="text-xs text-slate-400 font-medium">Energy Reduction</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-['Outfit'] text-white">
                {dynamicReductionPercent.toFixed(1)}%
              </span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> Saved
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">vs. 100% manual baseline</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Monthly Room Bill Savings */}
        <div className="glass-panel p-4 flex items-center justify-between border-slate-800 hover:border-cyan-500/30 transition-all">
          <div>
            <span className="text-xs text-slate-400 font-medium">Monthly Savings (Room)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-['Outfit'] text-cyan-400">
                {monthlySavedKwh.toFixed(1)} <span className="text-sm font-normal text-slate-400">kWh</span>
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-0.5 font-mono">
              ₹{Math.round(monthlyBillSavingsPerRoom).toLocaleString()} / mo (@ ₹{tariffRate}/kWh)
            </p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Today's Live Sensor Runtime */}
        <div className="glass-panel p-4 flex items-center justify-between border-slate-800 hover:border-amber-500/30 transition-all">
          <div>
            <span className="text-xs text-slate-400 font-medium">Today's Sensor Usage</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-['Outfit'] text-amber-400 font-mono">
                {formatDuration(todayActiveSec)}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Saved: {formatDuration(todayVacantSec)} | {todayWhSaved.toFixed(1)} Wh saved
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Session Duty Cycle Accumulator */}
        <div className="glass-panel p-4 flex items-center justify-between border-slate-800 hover:border-purple-500/30 transition-all">
          <div>
            <span className="text-xs text-slate-400 font-medium">Live Session Energy</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-['Outfit'] text-purple-400 font-mono">
                {sessionWhSaved.toFixed(2)} <span className="text-sm font-normal text-slate-400">Wh</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Session: {formatDuration(sessionSeconds)} ({sessionSensorWh.toFixed(1)} Wh drawn)
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. Hero Visual Chart with Metric Switcher */}
      <div className="glass-panel p-5 space-y-4">
        
        {/* Chart Header + View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>
                {chartView === 'monthly' 
                  ? 'Monthly Consumption Comparison (kWh)' 
                  : dailyMetric === 'minutes' 
                  ? 'Daily Sensor Activity (Active Minutes ON: 8 AM – 8 PM)' 
                  : dailyMetric === 'energy' 
                  ? 'Hourly Energy Consumption (Watt-hours Wh)' 
                  : 'Hourly Electrical Load Profile (Watts W)'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {chartView === 'monthly' 
                ? 'Manual continuous baseline vs. 24GHz mmWave automated smart classroom' 
                : dailyMetric === 'minutes' 
                ? 'Tracks and plots actual minutes when the mmWave radar detected presence in each hour' 
                : dailyMetric === 'energy' 
                ? 'Calculates real-time watt-hours consumed based on 144W Lights + 150W Fans active duty cycle' 
                : 'Real-time instantaneous power draw (294W Active vs. 0W Standby)'}
            </p>
          </div>

          {/* Metric & View Switchers */}
          <div className="flex flex-wrap items-center gap-2">
            {chartView === 'daily' && (
              <>
                {/* Chart Style Switcher: Columns vs Line */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setDailyChartType('bar')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      dailyChartType === 'bar'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Discrete 1-hour blocks (no artificial slopes between hours)"
                  >
                    Columns (Bar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyChartType('line')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      dailyChartType === 'line'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Continuous line trend"
                  >
                    Trend (Line)
                  </button>
                </div>

                {/* Metric Switcher */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setDailyMetric('minutes')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      dailyMetric === 'minutes'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Minutes (min)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyMetric('energy')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      dailyMetric === 'energy'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Energy (Wh)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyMetric('watts')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      dailyMetric === 'watts'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Load (W)
                  </button>
                </div>
              </>
            )}

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setChartView('daily')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  chartView === 'daily' 
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hourly Sensor View
              </button>
              <button
                type="button"
                onClick={() => setChartView('monthly')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  chartView === 'monthly' 
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly (kWh)
              </button>
            </div>
          </div>
        </div>

        {/* Live Academic Hourly Usage Mini-Banner */}
        {chartView === 'daily' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Today Active Runtime</span>
                <div className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {formatDuration(todayActiveSec)}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Vacant Standby Saved</span>
                <div className="text-cyan-400 font-bold text-sm">
                  {formatDuration(todayVacantSec)}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Current Instant Load</span>
                <div className={`text-sm font-bold flex items-center gap-1.5 ${currentTotalWatts > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${currentTotalWatts > 0 ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`} />
                  {currentTotalWatts > 0 ? `${currentTotalWatts}W Active` : '0W Cutoff'}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Energy Saved Today</span>
                <div className="text-emerald-400 font-bold text-sm">
                  {todayWhSaved.toFixed(1)} Wh (₹{todayCostSavedINR.toFixed(2)})
                </div>
              </div>
            </div>

            {/* Active Sensor Hour Badges Row + Demo Data Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Hours Sensor Was Active:
                </span>
                {activeHourSummary.length > 0 ? (
                  activeHourSummary.map((item) => (
                    <span
                      key={item.hour}
                      className={`px-2 py-0.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
                        item.isCurrent && presenceDetected
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse'
                          : 'bg-slate-900 border-slate-700 text-emerald-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isCurrent && presenceDetected ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
                      {item.label}: {item.duration}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-[11px] italic">
                    Sensor is logging in real-time ({presenceDetected ? 'Accumulating current hour' : 'Vacant standby'})
                  </span>
                )}
              </div>

              {/* Demo Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleLoadAcademicSampleData}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition-all flex items-center gap-1"
                  title="Load representative university timetable occupancy data for demo presentation"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Load Timetable Demo Data</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetTodayUsage}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] transition-all flex items-center gap-1"
                  title="Clear today's usage logs and restart fresh"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Canvas Container */}
        <div className="w-full h-80 pt-2">
          {chartView === 'monthly' ? (
            <Bar key="chart-view-monthly" data={monthlyChartData} options={chartOptions} />
          ) : dailyChartType === 'line' ? (
            <Line key={`chart-view-daily-line-${dailyMetric}`} data={hourlyChartData} options={chartOptions} />
          ) : (
            <Bar key={`chart-view-daily-bar-${dailyMetric}`} data={hourlyChartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* 4. Soft-Sensing Virtual Power Breakdown (No CT clamp needed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Appliance 1: 4x LED Batten Array */}
        <div className={`p-4 rounded-xl border glass-panel transition-all ${
          lightRelay 
            ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.12)]' 
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${lightRelay ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-500'}`}>
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">4x 36W LED Tube Array</h5>
                <span className="text-[10px] text-slate-400 font-mono">Channel 1 (GPIO 26 Optocoupler)</span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              lightRelay ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}>
              {lightRelay ? 'ACTIVE: 144W' : 'STANDBY: 0W'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800 font-mono">
            <span>Power Consumption:</span>
            <span className="text-white font-bold">{lightRelay ? '144 Watts (0.144 kW)' : '0.00 Watts'}</span>
          </div>
        </div>

        {/* Appliance 2: 2x High-Efficiency Fans */}
        <div className={`p-4 rounded-xl border glass-panel transition-all ${
          fanSpeed > 0 
            ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.12)]' 
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${fanSpeed > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900 text-slate-500'}`}>
                <Fan className={`w-4 h-4 ${fanSpeed > 0 ? 'animate-spin text-amber-300' : ''}`} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">2x 75W Heavy Duty Ceiling Fans</h5>
                <span className="text-[10px] text-slate-400 font-mono">Channel 2 (GPIO 27 Optocoupler)</span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              fanSpeed > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}>
              {fanSpeed > 0 ? 'ACTIVE: 150W' : 'STANDBY: 0W'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800 font-mono">
            <span>Power Consumption:</span>
            <span className="text-white font-bold">{fanSpeed > 0 ? '150 Watts (0.150 kW)' : '0.00 Watts'}</span>
          </div>
        </div>

      </div>

      {/* 5. Campus-Scale Impact: Clean 2-Slider Interactive Card */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Campus Scale Estimator
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">Institutional ROI Projection</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Slider 1: Rooms */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Classrooms Automated</span>
              <span className="font-mono text-cyan-400 font-bold">{classroomCount} Rooms</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={classroomCount}
              onChange={(e) => setClassroomCount(parseInt(e.target.value, 10))}
            />
          </div>

          {/* Slider 2: Tariff */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Electricity Tariff Rate</span>
              <span className="font-mono text-emerald-400 font-bold">₹{tariffRate.toFixed(2)} / kWh</span>
            </div>
            <input
              type="range"
              min="4"
              max="16"
              step="0.5"
              value={tariffRate}
              onChange={(e) => setTariffRate(parseFloat(e.target.value))}
            />
          </div>

        </div>

        {/* Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 text-center">
            <span className="text-[11px] text-slate-400">Annual Campus Savings</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              ₹{Math.round(annualCampusSavings).toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30 text-center">
            <span className="text-[11px] text-slate-400">Annual Energy Saved</span>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
              {Math.round(annualCampusKwhSaved).toLocaleString()} kWh
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 text-center">
            <span className="text-[11px] text-slate-400">Carbon Offset</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
              {annualCampusCo2Tons.toFixed(1)} Tons CO₂
            </div>
          </div>
        </div>

      </div>

      {/* 6. Clean Footnote */}
      <div className="text-center text-[11px] text-slate-500 font-mono">
        💡 Virtual Soft-Sensing: Power computed from Relay 1 (144W Lights) + Relay 2 (150W Fan) active duty cycle. No external CT current clamp required.
      </div>

    </div>
  );
}
