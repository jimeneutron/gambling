/**
 * Firebase Configuration for CasinoSim
 * =====================================
 * IMPORTANT: Replace the placeholder values below with your own Firebase config.
 * 
 * Setup Instructions:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Authentication (Google & Email/Password providers)
 * 4. Create a Firestore Database (start in test mode for development)
 * 5. Go to Project Settings > General > Your apps > Web app
 * 6. Copy the firebaseConfig object and replace the placeholders below
 * 
 * NOTE: This version works without ES6 modules for local file access
 */

// ============================================
// FIREBASE SDK IMPORTS (CDN)
// ============================================

// Firebase App (the core Firebase SDK)
const firebaseAppScript = document.createElement('script');
firebaseAppScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
document.head.appendChild(firebaseAppScript);

// Firebase Auth
const firebaseAuthScript = document.createElement('script');
firebaseAuthScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
document.head.appendChild(firebaseAuthScript);

// Firebase Firestore
const firebaseFirestoreScript = document.createElement('script');
firebaseFirestoreScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
document.head.appendChild(firebaseFirestoreScript);

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
    return firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
           firebaseConfig.apiKey !== "" &&
           firebaseConfig.apiKey !== null;
}

function initFirebase() {
    if (!isConfigValid()) {
        console.warn('⚠️ Firebase config not set. Running in demo mode.');
        console.warn('⚠️ To enable Firebase, update js/firebase-config.js with your API keys.');
        return;
    }
    
    try {
        if (typeof firebase !== 'undefined') {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth(app);
            db = firebase.firestore(app);
            firebaseReady = true;
            console.log('✅ Firebase initialized successfully');
        } else {
            console.warn('⚠️ Firebase SDK not loaded yet. Waiting...');
        }
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        console.warn('⚠️ Running in demo mode without Firebase.');
    }
}

// Wait for Firebase scripts to load, then initialize
function waitForFirebase() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkFirebase = () => {
            attempts++;
            if (typeof firebase !== 'undefined') {
                initFirebase();
                resolve();
            } else if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.warn('⚠️ Firebase SDK failed to load. Running in demo mode.');
                resolve();
            }
        };
        
        checkFirebase();
    });
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

async function signInWithGoogle() {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    
    // Request email scope explicitly
    googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
    googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    // Set custom parameters to force account selection
    googleProvider.setCustomParameters({
        prompt: 'select_account'
    });
    
    try {
        console.log('Initiating Google sign-in...');
        const result = await auth.signInWithPopup(googleProvider);
        
        // Check if email is verified
        if (result.user && !result.user.emailVerified) {
            console.warn('⚠️ User signed in with unverified email');
        }
        
        console.log('✅ Google sign-in successful:', result.user.displayName);
        return result.user;
    } catch (error) {
        console.error('❌ Google sign-in error:', error.code, error.message);
        
        // Provide more helpful error messages
        if (error.code === 'auth/popup-blocked') {
            throw new Error('Popup was blocked. Please allow popups for this site.');
        } else if (error.code === 'auth/cancelled-popup-request') {
            throw new Error('Sign-in popup was already open.');
        } else if (error.code === 'auth/operation-not-allowed') {
            throw new Error('Google sign-in is not enabled. Please enable it in Firebase Console.');
        } else if (error.code === 'auth/unauthorized-domain') {
            throw new Error('This domain is not authorized for OAuth. Add it to Firebase Console → Authentication → Settings → Authorized domains.');
        }
        
        throw error;
    }
}

async function registerWithEmail(email, password) {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    try {
        // Create user with email and password
        const result = await auth.createUserWithEmailAndPassword(email, password);
        
        // Send email verification
        if (result.user) {
            await result.user.sendEmailVerification();
            console.log('✅ Email verification sent');
        }
        
        console.log('✅ Email registration successful:', email);
        return result.user;
    } catch (error) {
        console.error('❌ Email registration error:', error.code, error.message);
        throw error;
    }
}

async function signInWithEmail(email, password) {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        
        // Check if email is verified
        if (result.user && !result.user.emailVerified) {
            // Sign out and throw error
            await auth.signOut();
            throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
        }
        
        console.log('✅ Email sign-in successful:', email);
        return result.user;
    } catch (error) {
        console.error('❌ Email sign-in error:', error.code, error.message);
        if (error.message && error.message.includes('verify your email')) {
            throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
        }
        throw error;
    }
}

async function resendVerificationEmail() {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No user signed in');
    }
    
    if (user.emailVerified) {
        throw new Error('Email already verified');
    }
    
    try {
        await user.sendEmailVerification();
        console.log('✅ Verification email resent');
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        throw error;
    }
}

async function logoutUser() {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    try {
        await auth.signOut();
        console.log('✅ User signed out successfully');
    } catch (error) {
        console.error('❌ Sign-out error:', error.code, error.message);
        throw error;
    }
}

function onAuthChange(callback) {
    if (!auth) {
        console.warn('⚠️ Auth listener not available in demo mode');
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
        console.log('🎮 Demo mode: Using local data');
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
            console.log('✅ User data retrieved:', data.displayName || data.uid);
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
            console.log('✅ New user document created');
            
            return {
                ...newUserData,
                createdAt: new Date(),
                lastPlayed: new Date()
            };
        }
    } catch (error) {
        console.error('❌ Error getting user data:', error.code, error.message);
        throw error;
    }
}

async function updateUserBalance(uid, newBalance) {
    if (!db) {
        console.log(`🎮 Demo mode: Balance updated to $${newBalance}`);
        return;
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        await userRef.update({
            balance: newBalance,
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Balance updated:', newBalance);
    } catch (error) {
        console.error('❌ Error updating balance:', error.code, error.message);
        throw error;
    }
}

function subscribeToUserData(uid, callback) {
    if (!db) {
        console.warn('⚠️ Real-time updates not available in demo mode');
        return () => {};
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        return userRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                callback(docSnap.data());
            }
        }, (error) => {
            console.error('❌ Snapshot error:', error);
        });
    } catch (error) {
        console.error('❌ Subscribe error:', error);
        return () => {};
    }
}

async function updateUserStats(uid, stats) {
    if (!db) {
        console.log('🎮 Demo mode: Stats not saved');
        return;
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        await userRef.update({
            ...stats,
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Stats updated');
    } catch (error) {
        console.error('❌ Error updating stats:', error.code, error.message);
    }
}

async function resetUserBalance(uid) {
    if (!db) {
        console.log('🎮 Demo mode: Balance reset to $1000');
        return DEFAULT_BALANCE;
    }
    
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        await userRef.update({
            balance: DEFAULT_BALANCE,
            currentStreak: 0
        });
        console.log('✅ Balance reset to $1000');
        return DEFAULT_BALANCE;
    } catch (error) {
        console.error('❌ Error resetting balance:', error.code, error.message);
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
    registerWithEmail,
    signInWithEmail,
    resendVerificationEmail,
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

// Initialize Firebase when this script loads
waitForFirebase();
