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
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInAnonymously,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc,
    onSnapshot,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// FIREBASE CONFIGURATION - REPLACE THESE VALUES
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAORZOnXK_g7lCiW2q56o8G0gdwC2JUjXE",
    authDomain: "jimmygamblez.firebaseapp.com",
    projectId: "jimmygamblez",
    storageBucket: "jimmygamblez.firebasestorage.app",
    messagingSenderId: "460694639672",
    appId: "1:460694639672:web:30a08507b41f521ecac2cd"
};

// ============================================
// INITIALIZE FIREBASE
// ============================================

// Check if config is properly set
const isConfigValid = () => {
    return firebaseConfig.apiKey !== "AIzaSyAORZOnXK_g7lCiW2q56o8G0gdwC2JUjXE" && 
           firebaseConfig.apiKey !== "";
};

// Initialize Firebase (only if config is valid)
let app, auth, db;

try {
    if (isConfigValid()) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log('✅ Firebase initialized successfully');
    } else {
        console.warn('⚠️ Firebase config not set. Running in demo mode.');
    }
} catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.warn('⚠️ Running in demo mode without Firebase.');
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Sign in with Google
 * @returns {Promise<Object>} User credential
 */
export const signInWithGoogle = async () => {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    try {
        const result = await signInWithPopup(auth, provider);
        console.log('✅ Google sign-in successful:', result.user.displayName);
        return result.user;
    } catch (error) {
        console.error('❌ Google sign-in error:', error.code, error.message);
        throw error;
    }
};

/**
 * Sign in anonymously
 * @returns {Promise<Object>} User credential
 */
export const signInAsGuest = async () => {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    try {
        const result = await signInAnonymously(auth);
        console.log('✅ Anonymous sign-in successful:', result.user.uid);
        return result.user;
    } catch (error) {
        console.error('❌ Anonymous sign-in error:', error.code, error.message);
        throw error;
    }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
    if (!auth) {
        throw new Error('Firebase Auth not initialized');
    }
    
    try {
        await signOut(auth);
        console.log('✅ User signed out successfully');
    } catch (error) {
        console.error('❌ Sign-out error:', error.code, error.message);
        throw error;
    }
};

/**
 * Listen for auth state changes
 * @param {Function} callback - Called with user or null
 * @returns {Function} Unsubscribe function
 */
export const onAuthChange = (callback) => {
    if (!auth) {
        // In demo mode, return dummy unsubscribe
        console.warn('⚠️ Auth listener not available in demo mode');
        return () => {};
    }
    
    return onAuthStateChanged(auth, callback);
};

// ============================================
// FIRESTORE DATABASE FUNCTIONS
// ============================================

const USERS_COLLECTION = 'users';
const DEFAULT_BALANCE = 1000; // Starting balance for new users

/**
 * Get or create user document
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User data
 */
export const getUserData = async (uid) => {
    if (!db) {
        // Demo mode - return default data
        console.log('🎮 Demo mode: Using local data');
        return {
            uid,
            balance: DEFAULT_BALANCE,
            displayName: 'Demo Player',
            createdAt: new Date(),
            gamesPlayed: 0,
            totalWins: 0,
            totalLosses: 0
        };
    }
    
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            console.log('✅ User data retrieved:', data.displayName);
            return data;
        } else {
            // Create new user document
            const newUserData = {
                uid,
                balance: DEFAULT_BALANCE,
                gamesPlayed: 0,
                totalWins: 0,
                totalLosses: 0,
                totalPushes: 0,
                biggestWin: 0,
                currentStreak: 0,
                createdAt: serverTimestamp(),
                lastPlayed: serverTimestamp()
            };
            
            await setDoc(userRef, newUserData);
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
};

/**
 * Update user balance
 * @param {string} uid - User ID
 * @param {number} newBalance - New balance amount
 * @returns {Promise<void>}
 */
export const updateUserBalance = async (uid, newBalance) => {
    if (!db) {
        console.log(`🎮 Demo mode: Balance updated to $${newBalance}`);
        return;
    }
    
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            balance: newBalance,
            lastPlayed: serverTimestamp()
        });
        console.log('✅ Balance updated:', newBalance);
    } catch (error) {
        console.error('❌ Error updating balance:', error.code, error.message);
        throw error;
    }
};

/**
 * Subscribe to user data changes (real-time updates)
 * @param {string} uid - User ID
 * @param {Function} callback - Called with user data on changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUserData = (uid, callback) => {
    if (!db) {
        console.warn('⚠️ Real-time updates not available in demo mode');
        return () => {};
    }
    
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        return onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            }
        }, (error) => {
            console.error('❌ Snapshot error:', error);
        });
    } catch (error) {
        console.error('❌ Subscribe error:', error);
        return () => {};
    }
};

/**
 * Update user statistics after a game
 * @param {string} uid - User ID
 * @param {Object} stats - Game statistics
 * @returns {Promise<void>}
 */
export const updateUserStats = async (uid, stats) => {
    if (!db) {
        console.log('🎮 Demo mode: Stats not saved');
        return;
    }
    
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            ...stats,
            lastPlayed: serverTimestamp()
        });
        console.log('✅ Stats updated');
    } catch (error) {
        console.error('❌ Error updating stats:', error.code, error.message);
    }
};

/**
 * Reset user balance (bankruptcy recovery)
 * @param {string} uid - User ID
 * @returns {Promise<number>} New balance
 */
export const resetUserBalance = async (uid) => {
    if (!db) {
        console.log('🎮 Demo mode: Balance reset to $1000');
        return DEFAULT_BALANCE;
    }
    
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            balance: DEFAULT_BALANCE,
            currentStreak: 0
        });
        console.log('✅ Balance reset to $1000');
        return DEFAULT_BALANCE;
    } catch (error) {
        console.error('❌ Error resetting balance:', error.code, error.message);
        throw error;
    }
};

// ============================================
// EXPORT STATUS CHECK
// ============================================

export const isFirebaseReady = () => isConfigValid() && app !== null;

export { auth, db };
