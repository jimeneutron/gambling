/**
 * Firebase Configuration for CasinoSim
 * =====================================
 * IMPORTANT: Replace the placeholder values below with your own Firebase config.
 * 
 * Setup Instructions:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Authentication (Google & Anonymous providers)
 * 4. Create a Firestore Database (start in test mode for development)
 * 5. Go to Project Settings > General > Your apps > Web app
 * 6. Copy the firebaseConfig object and replace the placeholders below
 * 
 * NOTE: This version works without ES6 modules for local file access
 */

// ============================================
// FIREBASE CONFIGURATION - REPLACE THESE VALUES
// ============================================

const firebaseConfig = {

  apiKey: "AIzaSyAORZOnXK_g7lCiW2q56o8G0gdwC2JUjXE",

  authDomain: "jimmygamblez.firebaseapp.com",

  projectId: "jimmygamblez",

  storageBucket: "jimmygamblez.firebasestorage.app",

  messagingSenderId: "460694639672",

  appId: "1:460694639672:web:30a08507b41f521ecac2cd",

  measurementId: "G-GR7GJH2P8J"

};


// ============================================
// INITIALIZE FIREBASE
// ============================================

let app = null;
let auth = null;
let db = null;
let firebaseReady = false;

function isConfigValid() {
    // Check if API key is set properly
    return firebaseConfig.apiKey && 
           firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
           firebaseConfig.apiKey.length > 30;
}

// Function to load a script dynamically
function loadScript(src, onload, onerror) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = onload;
    script.onerror = onerror;
    script.async = false;
    document.head.appendChild(script);
}

// Load Firebase SDKs in sequence and initialize
function initializeFirebase() {
    if (!isConfigValid()) {
        console.warn('Firebase config not set. Running in demo mode.');
        return;
    }
    
    // Check if Firebase is already loaded (from head section)
    if (typeof firebase !== 'undefined') {
        // Firebase already loaded, just initialize
        try {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth(app);
            db = firebase.firestore(app);
            firebaseReady = true;
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error.message);
        }
        return;
    }
    
    // Firebase not loaded yet, load scripts
    loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js', function() {
        loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js', function() {
            loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js', function() {
                // All scripts loaded, initialize Firebase
                if (typeof firebase !== 'undefined') {
                    try {
                        app = firebase.initializeApp(firebaseConfig);
                        auth = firebase.auth(app);
                        db = firebase.firestore(app);
                        firebaseReady = true;
                        console.log('Firebase initialized successfully');
                    } catch (error) {
                        console.error('Firebase initialization failed:', error.message);
                    }
                } else {
                    console.warn('Firebase SDK not available');
                }
            }, function() {
                console.error('Failed to load firebase-firestore-compat.js');
            });
        }, function() {
            console.error('Failed to load firebase-auth-compat.js');
        });
    }, function() {
        console.error('Failed to load firebase-app-compat.js');
    });
}

// Initialize Firebase
initializeFirebase();

// Create a promise that resolves when Firebase is ready
window.firebaseReadyPromise = new Promise((resolve) => {
    // Check every 50ms if Firebase is ready
    const checkInterval = setInterval(() => {
        if (firebaseReady) {
            clearInterval(checkInterval);
            resolve();
        }
    }, 50);
    
    // Timeout after 10 seconds, still resolve
    setTimeout(() => {
        clearInterval(checkInterval);
        if (!firebaseReady) {
            console.warn('Firebase initialization timeout');
        }
        resolve();
    }, 10000);
});

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

async function signInWithGoogle() {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    try {
        const result = await auth.signInWithPopup(provider);
        console.log('Google sign-in successful:', result.user.displayName);
        return result.user;
    } catch (error) {
        console.error('Google sign-in error:', error.code, error.message);
        throw error;
    }
}

async function signInAsGuest() {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    try {
        const result = await auth.signInAnonymously(auth);
        console.log('Anonymous sign-in successful:', result.user.uid);
        return result.user;
    } catch (error) {
        console.error('Anonymous sign-in error:', error.code, error.message);
        throw error;
    }
}

async function logoutUser() {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    try {
        await auth.signOut();
        console.log('User signed out successfully');
    } catch (error) {
        console.error('Sign-out error:', error.code, error.message);
        throw error;
    }
}

function onAuthChange(callback) {
    if (!auth) {
        console.warn('Auth listener not available');
        return () => {};
    }
    
    return auth.onAuthStateChanged(callback);
}

// ============================================
// FIRESTORE DATABASE FUNCTIONS
// ============================================

const USERS_COLLECTION = 'users';
const DEFAULT_BALANCE = 1000;

async function getUserData(uid) {
    if (!db) {
        console.log('Demo mode: Using local data');
        return {
            uid,
            balance: DEFAULT_BALANCE,
            displayName: 'Demo Player',
            createdAt: new Date(),
            gamesPlayed: 0,
            totalWins: 0,
            totalLosses: 0,
            totalPushes: 0
        };
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        const userSnap = await userRef.get();
        
        if (userSnap.exists) {
            const data = userSnap.data();
            console.log('User data retrieved:', data.displayName || data.uid);
            return data;
        } else {
            const newUserData = {
                uid,
                balance: DEFAULT_BALANCE,
                gamesPlayed: 0,
                totalWins: 0,
                totalLosses: 0,
                totalPushes: 0,
                biggestWin: 0,
                currentStreak: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await userRef.set(newUserData);
            console.log('New user document created');
            
            return {
                ...newUserData,
                createdAt: new Date(),
                lastPlayed: new Date()
            };
        }
    } catch (error) {
        console.error('Error getting user data:', error.code, error.message);
        throw error;
    }
}

async function updateUserBalance(uid, newBalance) {
    if (!db) {
        console.log('Demo mode: Balance updated to $' + newBalance);
        return;
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        await userRef.update({
            balance: newBalance,
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Balance updated:', newBalance);
    } catch (error) {
        console.error('Error updating balance:', error.code, error.message);
        throw error;
    }
}

function subscribeToUserData(uid, callback) {
    if (!db) {
        console.warn('Real-time updates not available in demo mode');
        return () => {};
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        return userRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                callback(docSnap.data());
            }
        }, (error) => {
            console.error('Snapshot error:', error);
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        return () => {};
    }
}

async function updateUserStats(uid, stats) {
    if (!db) {
        console.log('Demo mode: Stats not saved');
        return;
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        await userRef.update({
            ...stats,
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Stats updated');
    } catch (error) {
        console.error('Error updating stats:', error.code, error.message);
    }
}

async function resetUserBalance(uid) {
    if (!db) {
        console.log('Demo mode: Balance reset to $1000');
        return DEFAULT_BALANCE;
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        await userRef.update({
            balance: DEFAULT_BALANCE,
            currentStreak: 0
        });
        console.log('Balance reset to $1000');
        return DEFAULT_BALANCE;
    } catch (error) {
        console.error('Error resetting balance:', error.code, error.message);
        throw error;
    }
}

function isFirebaseReady() {
    return firebaseReady;
}

// ============================================
// GLOBAL EXPORTS (for compatibility)
// ============================================

window.firebaseAuth = {
    signInWithGoogle,
    signInAsGuest,
    logoutUser,
    onAuthChange,
    isFirebaseReady
};

window.firebaseDb = {
    getUserData,
    updateUserBalance,
    subscribeToUserData,
    updateUserStats,
    resetUserBalance
};
