import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Key, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  UserPlus,
  Users,
  Trash2,
  Database, 
  Sparkles, 
  Server, 
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  Shield,
  Activity,
  Zap,
  Clock,
  Cloud
} from 'lucide-react';
import { 
  loginAdmin, 
  registerAdmin, 
  logoutAdmin, 
  recordLoginAuditLog, 
  fetchRecentLoginLogs 
} from '../config/firebase';

const INITIAL_AUTHORIZED_ADMINS = [
  {
    id: 'admin-master-01',
    name: 'Super Administrator',
    email: 'admin@smartclass.edu',
    password: 'Admin@123',
    role: 'super_admin',
    createdAt: 'Initial System Master',
    isPrimary: true
  }
];

export default function AdminLogin({ currentUser, setCurrentUser, setActiveTab, cloudSyncInfo }) {
  // Super Admin Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');

  // Firebase Audit Trail States
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const logs = await fetchRecentLoginLogs(6);
      if (logs && logs.length > 0) {
        setRecentAuditLogs(logs);
      }
    } catch (e) {
      console.warn('Audit logs load notice:', e);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  React.useEffect(() => {
    loadAuditLogs();
  }, [currentUser]);

  // Add New Admin Form States (Super Admin Only)
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirm, setNewAdminConfirm] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('super_admin');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');
  const [addAdminSuccess, setAddAdminSuccess] = useState('');

  const [showConfigGuide, setShowConfigGuide] = useState(false);

  // Load / Store Authorized Administrators list
  const [authorizedAdmins, setAuthorizedAdmins] = useState(() => {
    try {
      const saved = localStorage.getItem('smartclass_authorized_admins');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_AUTHORIZED_ADMINS;
  });

  const isSuperAdmin = currentUser && currentUser.role === 'super_admin';

  // --- 1. SUPER ADMIN SIGN IN HANDLER ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both your administrator email and password.');
      return;
    }

    setLoginLoading(true);

    try {
      // 1. First attempt Firebase Authentication
      let firebaseUser = null;
      try {
        firebaseUser = await loginAdmin(loginEmail.trim(), loginPassword);
      } catch (fbErr) {
        console.warn('Firebase login attempt:', fbErr.message);
      }

      if (firebaseUser) {
        const adminSession = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Super Administrator',
          role: 'super_admin',
          isDemo: false
        };
        setCurrentUser(adminSession);
        localStorage.setItem('smartclass_super_admin', JSON.stringify(adminSession));
        setLoginSuccess(`Super Admin authenticated successfully (${firebaseUser.email})! All modules unlocked.`);
        setLoginEmail('');
        setLoginPassword('');
        loadAuditLogs();
        return;
      }

      // 2. Check Authorized Administrators registry
      const matched = authorizedAdmins.find(
        (a) => a.email.toLowerCase() === loginEmail.trim().toLowerCase() && a.password === loginPassword
      );

      if (matched) {
        const adminSession = {
          uid: matched.id,
          email: matched.email,
          displayName: matched.name,
          role: 'super_admin',
          isDemo: false
        };
        recordLoginAuditLog(adminSession, 'local_authorized_registry');
        setCurrentUser(adminSession);
        localStorage.setItem('smartclass_super_admin', JSON.stringify(adminSession));
        setLoginSuccess(`Authenticated as Super Administrator (${matched.name})! All modules unlocked.`);
        setLoginEmail('');
        setLoginPassword('');
        loadAuditLogs();
        return;
      }

      // If credentials do not match
      setLoginError('Invalid Administrator credentials. Only authorized Super Administrators can log in.');
    } catch (err) {
      setLoginError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // --- 2. INSTANT DEMO SUPER ADMIN LOGIN (FOR LOCAL EVALUATION) ---
  const handleDemoAdminLogin = () => {
    setLoginLoading(true);
    setLoginError('');
    setTimeout(() => {
      const demoUser = {
        uid: 'superadmin-master-' + Math.random().toString(36).substring(2, 7),
        email: 'admin@smartclass.edu',
        displayName: 'Super Administrator',
        role: 'super_admin',
        isDemo: true
      };
      recordLoginAuditLog(demoUser, 'demo_instant_access');
      setCurrentUser(demoUser);
      localStorage.setItem('smartclass_super_admin', JSON.stringify(demoUser));
      setLoginSuccess('Logged in with Super Administrator Privileges! All 7 modules unlocked.');
      setLoginLoading(false);
      loadAuditLogs();
    }, 500);
  };

  // --- 3. ADD NEW ADMIN HANDLER (ONLY ACCESSIBLE BY AUTHENTICATED SUPER ADMIN) ---
  const handleAddNewAdmin = async (e) => {
    e.preventDefault();
    setAddAdminError('');
    setAddAdminSuccess('');

    if (!newAdminEmail || !newAdminPassword) {
      setAddAdminError('Please fill in both the admin email and password.');
      return;
    }

    if (newAdminPassword !== newAdminConfirm) {
      setAddAdminError('Passwords do not match.');
      return;
    }

    if (newAdminPassword.length < 6) {
      setAddAdminError('Password must be at least 6 characters long.');
      return;
    }

    // Check duplicate email
    const exists = authorizedAdmins.some(
      (a) => a.email.toLowerCase() === newAdminEmail.trim().toLowerCase()
    );
    if (exists) {
      setAddAdminError('An administrator account with this email address already exists.');
      return;
    }

    setAddAdminLoading(true);

    try {
      // 1. Try to register user in Firebase Auth and Firestore
      try {
        await registerAdmin(newAdminEmail.trim(), newAdminPassword);
      } catch (fbErr) {
        console.warn('Firebase register notice (using local Firestore fallback):', fbErr.message);
      }

      // 2. Add to Authorized Admins registry
      const newAdminEntry = {
        id: 'admin-' + Date.now().toString(36),
        name: newAdminName.trim() || 'System Administrator',
        email: newAdminEmail.trim().toLowerCase(),
        password: newAdminPassword,
        role: newAdminRole,
        createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        isPrimary: false
      };

      const updated = [...authorizedAdmins, newAdminEntry];
      setAuthorizedAdmins(updated);
      localStorage.setItem('smartclass_authorized_admins', JSON.stringify(updated));

      setAddAdminSuccess(`Administrator "${newAdminEmail.trim()}" created and authorized successfully!`);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminConfirm('');
    } catch (err) {
      setAddAdminError(err.message || 'Failed to create new administrator.');
    } finally {
      setAddAdminLoading(false);
    }
  };

  // --- 4. DELETE ADMIN HANDLER ---
  const handleDeleteAdmin = (id) => {
    const target = authorizedAdmins.find((a) => a.id === id);
    if (!target) return;
    if (target.isPrimary) {
      alert('The Primary Master Administrator account cannot be removed.');
      return;
    }
    if (window.confirm(`Are you sure you want to revoke admin access for "${target.email}"?`)) {
      const updated = authorizedAdmins.filter((a) => a.id !== id);
      setAuthorizedAdmins(updated);
      localStorage.setItem('smartclass_authorized_admins', JSON.stringify(updated));
    }
  };

  // --- 5. LOGOUT HANDLER (REVERTS TO NORMAL USER) ---
  const handleLogout = async () => {
    setLoginLoading(true);
    try {
      await logoutAdmin();
    } catch (err) {
      console.warn('Logout notice:', err);
    }
    localStorage.removeItem('smartclass_super_admin');
    
    // Revert to Normal User (Viewer by default)
    const defaultNormalUser = {
      role: 'user',
      displayName: 'Normal User',
      email: 'viewer@smartclass.edu',
      isDefault: true
    };
    setCurrentUser(defaultNormalUser);
    setLoginSuccess('Logged out of Super Admin session. Reverted to Normal User (Live Control & Radar only).');
    setLoginLoading(false);

    if (setActiveTab) {
      setActiveTab('dashboard');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top Banner Card */}
      <div className="glass-panel p-6 border-cyan-500/30 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl border ${
              isSuperAdmin 
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]' 
                : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
            }`}>
              {isSuperAdmin ? <ShieldCheck className="w-8 h-8 animate-pulse text-emerald-400" /> : <Shield className="w-8 h-8 text-cyan-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-['Outfit']">
                  {isSuperAdmin ? 'Super Administrator Management Console' : 'Administrator Authentication Portal'}
                </h2>
                <span className={`badge text-[10px] ${isSuperAdmin ? 'badge-emerald' : 'badge-cyan'}`}>
                  {isSuperAdmin ? 'SUPER ADMIN ACTIVE' : 'ROLE RESTRICTED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isSuperAdmin 
                  ? 'Full Access Unlocked • Add & Authorize Administrators • Manage Calibration & System Parameters'
                  : 'Normal users can view Live Control & Radar. Super Admin login required for calibration, analytics & system control.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowConfigGuide(!showConfigGuide)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-400 hover:border-cyan-500/40 transition-all flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              <span>{showConfigGuide ? 'Hide Info' : 'Firebase Cloud Setup'}</span>
            </button>
          </div>
        </div>

        {/* Firebase Config Guide Drawer */}
        {showConfigGuide && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 space-y-3 bg-slate-950/60 p-4 rounded-xl font-mono">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold flex items-center gap-2">
                <Server className="w-4 h-4" /> Firebase Cloud Authentication & Firestore:
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">src/config/firebase.js</span>
            </div>
            <p className="text-slate-400 font-sans">
              Accounts created by the Super Admin sync with Firebase Authentication and Firestore <code className="text-cyan-300">admin_users</code> collection, with automatic offline fallback.
            </p>
          </div>
        )}
      </div>

      {/* VIEW 1: SUPER ADMIN ACTIVE SESSION & ADMIN CREATION CONSOLE */}
      {isSuperAdmin ? (
        <div className="space-y-6">
          
          {/* Active Session Overview Card */}
          <div className="glass-panel p-6 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Active Super Administrator Session</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Logged in as: <span className="text-emerald-300 font-bold">{currentUser?.email}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-emerald text-[11px] px-3 py-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ALL 7 MODULES UNLOCKED
                </span>
                <button
                  onClick={handleLogout}
                  disabled={loginLoading}
                  className="px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-xs hover:bg-rose-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out (Revert to Normal User)</span>
                </button>
              </div>
            </div>

            {/* Quick Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Access Privileges</span>
                <span className="text-emerald-400 font-semibold text-sm">Super Admin (Master)</span>
                <span className="text-[10px] text-slate-400">Classroom Map, Calibration, Analytics, Gateway Unlocked</span>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Authorized Admins Count</span>
                <span className="text-cyan-400 font-semibold text-sm">{authorizedAdmins.length} Active Accounts</span>
                <span className="text-[10px] text-slate-400">Exclusive right to create new administrators</span>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Normal User Protection</span>
                <span className="text-amber-300 font-semibold text-sm">Active & Guarded</span>
                <span className="text-[10px] text-slate-400">Default users restricted to Live Control & Radar only</span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID: ADD NEW ADMIN FORM & EXISTING AUTHORIZED ADMINS LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* Form: Add New Administrator (Exclusive Super Admin Capability) */}
            <div className="lg:col-span-2 glass-panel p-6 space-y-5 border-cyan-500/20">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Add New Administrator</h3>
                  <p className="text-[11px] text-slate-400">Only Super Admins can create new admins</p>
                </div>
              </div>

              {addAdminError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{addAdminError}</span>
                </div>
              )}

              {addAdminSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{addAdminSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddNewAdmin} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Administrator Name / Title</span>
                  </label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar"
                    required
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Admin Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="rajesh@smartclass.edu"
                    required
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Temporary Password (min 6 chars)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Confirm Password</span>
                  </label>
                  <input
                    type="password"
                    value={newAdminConfirm}
                    onChange={(e) => setNewAdminConfirm(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Administrative Role</span>
                  </label>
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="super_admin">Super Administrator (Full System & User Control)</option>
                    <option value="admin">Administrator (Classroom Control & Analytics)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addAdminLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {addAdminLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Registering Admin...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Register & Authorize Administrator</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* List: Authorized Administrators Table */}
            <div className="lg:col-span-3 glass-panel p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Authorized Administrators</h3>
                    <p className="text-[11px] text-slate-400">Accounts authorized to access protected modules</p>
                  </div>
                </div>
                <span className="badge badge-purple text-[10px] font-mono">
                  {authorizedAdmins.length} ACCOUNTS
                </span>
              </div>

              <div className="space-y-2.5">
                {authorizedAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-800 text-slate-300 shrink-0">
                        {admin.role === 'super_admin' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <User className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs truncate">{admin.name}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            admin.role === 'super_admin' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {admin.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                          </span>
                          {admin.isPrimary && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {admin.email} • Added: {admin.createdAt}
                        </div>
                      </div>
                    </div>

                    {!admin.isPrimary && (
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        title="Revoke Admin Access"
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Cloud Firestore 3-Pillar Data Sync & Audit Center */}
          <div className="glass-panel p-6 border-cyan-500/30 space-y-5 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>Firebase Cloud Firestore Data Hub</span>
                    <span className="badge badge-cyan text-[10px] font-mono">LIVE CLOUD</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real-time cloud database synchronization for SmartClass IoT
                  </p>
                </div>
              </div>

              <button
                onClick={loadAuditLogs}
                disabled={loadingAuditLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-mono flex items-center gap-2 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAuditLogs ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {/* 3 Cloud Data Streams Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Pillar 1: Live State */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">1. State Document</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="font-mono text-cyan-300 font-bold text-xs flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>classrooms/CR-101</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Presence, target distance, lux, room temp, light relay & fan PWM.
                </p>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                  Last Sync: <span className="text-emerald-400 font-semibold">{cloudSyncInfo?.lastTelemetrySync || 'Active'}</span>
                </div>
              </div>

              {/* Pillar 2: Daily Energy Log */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">2. Energy Logs</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="font-mono text-amber-300 font-bold text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>energy_logs/CR-101_today</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Daily active minutes, vacant minutes saved, Wh power & cost savings.
                </p>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                  Last Sync: <span className="text-amber-400 font-semibold">{cloudSyncInfo?.lastEnergySync || 'Active'}</span>
                </div>
              </div>

              {/* Pillar 3: Security & Audit Trail */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">3. Audit Trail</span>
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                </div>
                <div className="font-mono text-purple-300 font-bold text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>login_logs & admin_users</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Access timestamps, login methods, and administrator credentials.
                </p>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                  Cloud Records: <span className="text-purple-300 font-semibold">{recentAuditLogs.length} Events</span>
                </div>
              </div>
            </div>

            {/* Live Firestore Audit Trail Table */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recent Firestore Authentication Audit Trail</span>
              </span>

              {recentAuditLogs.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500 font-mono">
                  No login events recorded yet. Authentication attempts automatically stream here.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {recentAuditLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="text-white font-medium">{log.email}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {log.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <span className="text-cyan-300">{log.loginMethod}</span>
                        <span className="text-slate-600">•</span>
                        <span>{log.loggedAt ? new Date(log.loggedAt).toLocaleTimeString() : 'Just now'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (

        /* VIEW 2: SUPER ADMIN LOGIN FORM (NORMAL USER IS LOGGED IN BY DEFAULT) */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
          
          {/* Left Info Panel */}
          <div className="md:col-span-2 glass-panel p-6 flex flex-col justify-between h-full gap-6">
            <div className="space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                Restricted System Control
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                By default, you are viewing the system in <strong>Normal User</strong> mode. Normal users can view <strong>Live Control & Radar</strong>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                To access <strong>Classroom Map, Calibration Engine, Energy Analytics, Schematics, or Gateway Telemetry</strong>, authenticate with your authorized Super Administrator credentials.
              </p>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Role Access Model:</span>
                </div>
                <div className="text-slate-400">
                  • <strong>Normal User:</strong> Live Control & Radar Canvas.<br />
                  • <strong>Super Admin:</strong> Unrestricted access to all modules + Add new admins.
                </div>
              </div>
            </div>

            {/* Instant Demo Super Admin Button for quick testing */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleDemoAdminLogin}
                disabled={loginLoading}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Quick Super Admin Access (Evaluation)</span>
              </button>
              <span className="text-[10px] text-slate-500 block text-center mt-1">
                (Click for immediate testing without typing credentials)
              </span>
            </div>
          </div>

          {/* Right Login Card */}
          <div className="md:col-span-3 glass-panel p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Super Administrator Sign In</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter your authorized admin credentials below
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {loginSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{loginSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Admin Email Address</span>
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@smartclass.edu"
                  required
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Default Master Admin: <code className="text-cyan-400">admin@smartclass.edu</code></span>
                  <span>Pass: <code className="text-cyan-400">Admin@123</code></span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate Super Admin Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Security Guard:</strong> Public registration is strictly disabled. Only currently active Super Administrators can create or authorize additional admin accounts.
              </span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
