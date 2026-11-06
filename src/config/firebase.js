import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  addDoc, 
  query,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBbCCMCs6eBZHmpNAniad_0HX4RUilAR2I",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-classroom-a97b8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smart-classroom-a97b8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-classroom-a97b8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "241759046479",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:241759046479:web:f170f98972318436a1d33a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ============================================================================
// 1. LIVE SENSOR TELEMETRY & CLASSROOM STATE SYNC (Firestore: 'classrooms')
// ============================================================================
export async function syncLiveClassroomState(classroomId = 'CR-101', stateData = {}) {
  try {
    const roomRef = doc(db, 'classrooms', classroomId);
    const payload = {
      classroomId,
      presenceDetected: Boolean(stateData.presenceDetected),
      motionType: stateData.motionType || 'none',
      targetDistance: typeof stateData.targetDistance === 'number' ? Number(stateData.targetDistance.toFixed(2)) : 0,
      ambientLux: Number(stateData.ambientLux || 0),
      roomTemp: Number(stateData.roomTemp || 0),
      lightRelay: Boolean(stateData.lightRelay),
      fanSpeed: Number(stateData.fanSpeed || 0),
      manualOverride: Boolean(stateData.manualOverride),
      vacantCountdown: stateData.vacantCountdown ?? null,
      source: stateData.isSimulating ? 'simulation_gateway' : 'esp32_hardware',
      lastHeartbeat: serverTimestamp(),
      clientTime: new Date().toISOString()
    };
    await setDoc(roomRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firebase Live State sync notice:', error.message);
    return false;
  }
}

// ============================================================================
// 2. DAILY ENERGY CONSUMPTION & SAVINGS LOG (Firestore: 'energy_logs')
// ============================================================================
export async function syncDailyEnergyLog(classroomId = 'CR-101', dateStr, usageData = {}, metrics = {}) {
  try {
    const date = dateStr || new Date().toISOString().slice(0, 10);
    const docId = `${classroomId}_${date}`;
    const logRef = doc(db, 'energy_logs', docId);

    const activeSec = Number(usageData.activeSec || 0);
    const vacantSec = Number(usageData.vacantSec || 0);

    const payload = {
      classroomId,
      date,
      activeSec,
      vacantSec,
      activeMinutes: Math.round(activeSec / 60),
      vacantMinutes: Math.round(vacantSec / 60),
      hourlyBreakdown: usageData.hourly || {},
      todayWhConsumed: Number(metrics.todayWhConsumed || 0),
      todayWhSaved: Number(metrics.todayWhSaved || 0),
      costSavedINR: Number(metrics.costSavedINR || 0),
      co2ReducedKg: Number(metrics.co2ReducedKg || 0),
      lastSync: serverTimestamp(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(logRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firebase Energy Log sync notice:', error.message);
    return false;
  }
}

// ============================================================================
// 3. ADMIN AUTHENTICATION & AUDIT TRAIL LOGGING (Firestore: 'login_logs')
// ============================================================================
export async function recordLoginAuditLog(user, loginMethod = 'email_password') {
  if (!user) return false;

  const logEntry = {
    uid: user.uid || 'unregistered',
    email: user.email || 'unknown@smartclass.edu',
    displayName: user.displayName || 'Administrator',
    role: user.role || 'super_admin',
    isDemo: Boolean(user.isDemo),
    loginMethod,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser',
    timestamp: serverTimestamp(),
    loggedAt: new Date().toISOString()
  };

  try {
    // 1. Record log into 'login_logs' collection
    await addDoc(collection(db, 'login_logs'), logEntry);

    // 2. Update user profile document in 'admin_users'
    if (user.uid) {
      const userRef = doc(db, 'admin_users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: user.role || 'super_admin',
        displayName: user.displayName || 'Administrator',
        lastLogin: serverTimestamp(),
        lastLoginMethod: loginMethod
      }, { merge: true });
    }

    return true;
  } catch (error) {
    console.warn('Firebase Audit Log save notice:', error.message);
    return false;
  }
}

// Helper to fetch the recent login audit logs from Firestore
export async function fetchRecentLoginLogs(maxCount = 8) {
  try {
    const q = query(
      collection(db, 'login_logs'), 
      orderBy('timestamp', 'desc'), 
      limit(maxCount)
    );
    const snap = await getDocs(q);
    const logs = [];
    snap.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...docSnap.data() });
    });
    return logs;
  } catch (error) {
    console.warn('Firebase fetch audit logs notice:', error.message);
    return [];
  }
}

// Save Admin User Record & Login Log to Firestore (backward compatibility)
export async function saveAdminCredentials(user, loginMethod = 'email_password') {
  return recordLoginAuditLog(user, loginMethod);
}

// Authentication Wrappers
export async function loginAdmin(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await recordLoginAuditLog(credential.user, 'firebase_email_password');
  return credential.user;
}

export async function registerAdmin(email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await recordLoginAuditLog(credential.user, 'firebase_account_creation');
  return credential.user;
}

export async function logoutAdmin() {
  await signOut(auth);
}

export { onAuthStateChanged };
export default app;
