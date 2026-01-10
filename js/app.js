// MiniMax Gambling App - Application Controller with AI Dealer & Global Multiplayer
// Author: MiniMax Agent

// ============================================
// Constants
// ============================================
const DEFAULT_GROUP_ID = 'global_default_group';
const MIN_PLAYERS_TO_START = 2;

// ============================================
// Application State
// ============================================
const App = {
    currentUser: null,
    game: null,
    isMultiplayer: false,
    unsubscribeGameState: null,
    playerSeat: -1,
    isInGroup: false,
    dealerSeat: -1  // The player with the dealer button (controls game flow)
};

// ============================================
// DOM Elements Cache
// ============================================
const DOM = {
    // Auth Elements
    loginModal: null,
    emailForm: null,
    emailInput: null,
    passwordInput: null,
    registerBtn: null,
    loginBtn: null,
    logoutBtn: null,
    authError: null,
    
    // Game Elements
    gameContainer: null,
    potDisplay: null,
    phaseIndicator: null,
    messageCenter: null,
    bettingZone: null,
    foldBtn: null,
    checkBtn: null,
    callBtn: null,
    raiseBtn: null,
    allInBtn: null,
    raiseInput: null,
    balanceDisplay: null,
    betAmountDisplay: null,
    dealerInfo: null,
    turnIndicator: null,
    startGameBtn: null,  // Button for dealer to start the game
    
    // Multiplayer Elements
    playersList: null,
    
    // Card Elements
    playerCards: [],
    communityCards: [],
    dealerCards: []
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to be ready
    if (window.firebaseReadyPromise) {
        try {
            await window.firebaseReadyPromise;
        } catch (e) {
            console.warn('Firebase not available, running in demo mode');
        }
    }
    
    // Check if Firebase is actually available and initialized
    const isFirebaseReady = window.firebase && 
                             typeof window.firebase.auth === 'function' &&
                             typeof window.firebase.firestore === 'function' &&
                             window.firebase.apps && 
                             window.firebase.apps.length > 0;
    
    initializeDOMElements();
    setupEventListeners();
    
    if (isFirebaseReady) {
        setupFirebaseAuth();
        
        // Check for saved session
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                await loadUserData(user.uid);
            } else {
                showLoginModal();
            }
        } catch (e) {
            console.warn('Auth check failed, showing login modal');
            showLoginModal();
        }
    } else {
        // Demo mode - show login modal
        console.log('Running in demo mode (no Firebase)');
        showLoginModal();
    }
});

function initializeDOMElements() {
    // Auth Elements
    DOM.loginModal = document.getElementById('loginModal');
    DOM.emailForm = document.getElementById('emailForm');
    DOM.emailInput = document.getElementById('emailInput');
    DOM.passwordInput = document.getElementById('passwordInput');
    DOM.registerBtn = document.getElementById('registerBtn');
    DOM.loginBtn = document.getElementById('loginBtn');
    DOM.logoutBtn = document.getElementById('logoutBtn');
    DOM.authError = document.getElementById('authError');
    DOM.googleLoginBtn = document.getElementById('googleLoginBtn');
    DOM.emailLoginBtn = document.getElementById('emailLoginBtn');
    DOM.emailAuthSection = document.getElementById('emailAuthSection');
    
    // Game Elements
    DOM.gameApp = document.getElementById('gameApp');
    DOM.potDisplay = document.getElementById('potDisplay');
    DOM.phaseIndicator = document.getElementById('phaseIndicator');
    DOM.messageCenter = document.getElementById('messageCenter');
    DOM.bettingZone = document.getElementById('bettingZone');
    DOM.foldBtn = document.getElementById('foldBtn');
    DOM.checkBtn = document.getElementById('checkBtn');
    DOM.callBtn = document.getElementById('callBtn');
    DOM.raiseBtn = document.getElementById('raiseBtn');
    DOM.allInBtn = document.getElementById('allInBtn');
    DOM.raiseInput = document.getElementById('raiseInput');
    DOM.balanceDisplay = document.getElementById('balanceDisplay');
    DOM.betAmountDisplay = document.getElementById('betAmountDisplay');
    DOM.dealerInfo = document.getElementById('dealerInfo');
    DOM.turnIndicator = document.getElementById('turnIndicator');
    DOM.startGameBtn = document.getElementById('startGameBtn');
    
    // Card Elements
    DOM.playerCards = [
        document.getElementById('playerCard0'),
        document.getElementById('playerCard1')
    ];
    DOM.communityCards = [
        document.getElementById('communityCard0'),
        document.getElementById('communityCard1'),
        document.getElementById('communityCard2'),
        document.getElementById('communityCard3'),
        document.getElementById('communityCard4')
    ];
    DOM.dealerCards = [
        document.getElementById('dealerCard0'),
        document.getElementById('dealerCard1')
    ];
    
    // Multiplayer Elements
    DOM.playersList = document.getElementById('playersList');
    DOM.resetRoomBtn = document.getElementById('resetRoomBtn');
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Auth Events
    DOM.registerBtn?.addEventListener('click', handleRegister);
    DOM.loginBtn?.addEventListener('click', handleLogin);
    DOM.logoutBtn?.addEventListener('click', handleLogout);
    DOM.googleLoginBtn?.addEventListener('click', handleGoogleLogin);
    DOM.emailLoginBtn?.addEventListener('click', toggleEmailAuth);
    
    // Game Action Events
    DOM.foldBtn?.addEventListener('click', () => App.game?.playerAction('fold'));
    DOM.checkBtn?.addEventListener('click', () => App.game?.playerAction('check'));
    DOM.callBtn?.addEventListener('click', () => App.game?.playerAction('call'));
    DOM.raiseBtn?.addEventListener('click', () => App.game?.playerAction('raise', parseInt(DOM.raiseInput?.value) || 0));
    DOM.allInBtn?.addEventListener('click', () => App.game?.playerAction('allin'));
    
    // Raise input validation
    DOM.raiseInput?.addEventListener('input', () => {
        const raiseAmount = parseInt(DOM.raiseInput.value) || 0;
        if (raiseAmount > (App.currentUser?.balance || 0)) {
            DOM.raiseInput.value = App.currentUser?.balance || 0;
        }
    });
    
    // Dealer Start Game button
    DOM.startGameBtn?.addEventListener('click', () => {
        if (App.playerSeat === App.dealerSeat) {
            startGameFromDealer();
        }
    });
    
    // Reset Room button
    DOM.resetRoomBtn?.addEventListener('click', resetRoom);
}

// ============================================
// Firebase Authentication
// ============================================
function setupFirebaseAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            if (user.emailVerified) {
                // Pass user.uid, not the entire user object
                await loadUserData(user.uid);
            } else {
                showMessage('Please verify your email to play. Check your inbox for the verification link.');
                await firebase.auth().signOut();
                showLoginModal();
            }
        } else {
            showLoginModal();
        }
    });
}

async function handleRegister() {
    const email = DOM.emailInput.value;
    const password = DOM.passwordInput.value;
    
    if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await firebase.auth().currentUser.sendEmailVerification();
        showMessage('Registration successful! Please check your email to verify your account.');
        
        // Save initial balance to Firestore
        await saveUserData(userCredential.user.uid, {
            email: email,
            balance: 1000, // Starting balance
            totalWinnings: 0,
            gamesPlayed: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await firebase.auth().signOut();
    } catch (error) {
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function handleLogin() {
    const email = DOM.emailInput.value;
    const password = DOM.passwordInput.value;
    
    if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
    }
    
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        
        if (!userCredential.user.emailVerified) {
            showAuthError('Please verify your email before logging in');
            await firebase.auth().signOut();
            return;
        }
        
        // Load user data
        await loadUserData(userCredential.user.uid);
    } catch (error) {
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function handleGoogleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const userCredential = await firebase.auth().signInWithPopup(provider);
        
        if (!userCredential.user.emailVerified) {
            showAuthError('Please verify your Google email before logging in');
            await firebase.auth().signOut();
            return;
        }
        
        // Load user data
        await loadUserData(userCredential.user.uid);
    } catch (error) {
        console.error('Google login error:', error);
        showAuthError(getAuthErrorMessage(error.code));
    }
}

function toggleEmailAuth() {
    if (DOM.emailAuthSection) {
        DOM.emailAuthSection.classList.toggle('hidden');
    }
}

async function handleLogout() {
    // Leave the global group first
    await leaveGlobalGroup();
    
    if (App.game) {
        App.game.cleanup();
    }
    if (App.unsubscribeGameState) {
        App.unsubscribeGameState();
    }
    
    App.game = null;
    App.isMultiplayer = false;
    
    await firebase.auth().signOut();
    showLoginModal();
}

async function loadUserData(uid) {
    try {
        console.log('loadUserData called with uid:', uid);
        
        // Validate uid is a non-empty string
        if (!uid || typeof uid !== 'string' || uid.trim() === '') {
            console.error('Invalid uid:', uid);
            if (DOM.authError) {
                DOM.authError.textContent = 'Invalid user ID. Please sign in again.';
                DOM.authError.style.display = 'block';
            }
            // Still show game interface with default user
            App.currentUser = {
                uid: 'unknown',
                email: 'Player',
                balance: 1000,
                totalWinnings: 0,
                gamesPlayed: 0
            };
            showGameInterface();
            return;
        }
        
        // Use the email from the current user if already set (from Google login)
        const userEmail = App.currentUser?.email || 
                         (DOM.emailInput?.value && DOM.emailInput.value.trim() !== '' ? DOM.emailInput.value : 'Player');
        
        try {
            const userDoc = await firebase.firestore().collection('users').doc(uid.trim()).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                // Safely handle potential undefined values
                const userBalance = typeof userData.balance === 'number' ? userData.balance : 1000;
                
                App.currentUser = {
                    uid: uid.trim(),
                    email: userEmail,
                    balance: userBalance,
                    totalWinnings: userData.totalWinnings || 0,
                    gamesPlayed: userData.gamesPlayed || 0
                };
            } else {
                // Create user data if it doesn't exist
                const newUserData = {
                    email: userEmail,
                    balance: 1000,
                    totalWinnings: 0,
                    gamesPlayed: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await saveUserData(uid.trim(), newUserData);
                
                App.currentUser = {
                    uid: uid.trim(),
                    email: userEmail,
                    balance: 1000,
                    totalWinnings: 0,
                    gamesPlayed: 0
                };
            }
        } catch (firestoreError) {
            console.error('Firestore error, continuing with default user:', firestoreError);
            // Create default user data
            App.currentUser = {
                uid: uid.trim(),
                email: userEmail,
                balance: 1000,
                totalWinnings: 0,
                gamesPlayed: 0
            };
        }
        
        showGameInterface();
    } catch (error) {
        console.error('Error loading user data:', error);
        // Always show game interface even on error
        if (!App.currentUser) {
            App.currentUser = {
                uid: uid || 'unknown',
                email: 'Player',
                balance: 1000,
                totalWinnings: 0,
                gamesPlayed: 0
            };
        }
        showGameInterface();
    }
}

async function saveUserData(uid, data) {
    try {
        // Validate uid before using with Firestore
        if (!uid || typeof uid !== 'string' || uid.trim() === '') {
            console.error('Invalid uid for saveUserData:', uid);
            return;
        }
        await firebase.firestore().collection('users').doc(uid.trim()).set(data, { merge: true });
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

async function updateUserBalance(amount) {
    if (!App.currentUser) return;
    
    App.currentUser.balance += amount;
    
    if (amount > 0) {
        App.currentUser.totalWinnings += amount;
    }
    
    App.currentUser.gamesPlayed += 1;
    
    await saveUserData(App.currentUser.uid, {
        balance: App.currentUser.balance,
        totalWinnings: App.currentUser.totalWinnings,
        gamesPlayed: App.currentUser.gamesPlayed
    });
    
    updateBalanceDisplay();
}

// ============================================
// Global Group Management
// ============================================
async function joinGlobalGroup() {
    if (App.isInGroup) return;
    
    try {
        const groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        let groupDoc = await groupRef.get();
        
        if (!groupDoc.exists) {
            // Create the global group if it doesn't exist
            await groupRef.set({
                name: 'Global Poker Room',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                gameState: {
                    phase: 'waiting',
                    pot: 0,
                    communityCards: [],
                    players: {},
                    dealerCards: []
                },
                dealerSeat: -1  // No dealer yet
            });
            
            // Re-fetch the document after creating it
            groupDoc = await groupRef.get();
        }
        
        const groupData = groupDoc.data();
        
        // Handle dealer assignment
        const currentDealerSeat = groupData.dealerSeat !== undefined ? groupData.dealerSeat : -1;
        
        // If no dealer is assigned, assign this player as dealer
        if (currentDealerSeat === -1) {
            // Find an available seat for the dealer
            const occupiedSeats = Object.keys(groupData?.gameState?.players || {}).map(s => parseInt(s));
            let dealerSeat = -1;
            
            // First player joining becomes dealer
            if (occupiedSeats.length === 0) {
                dealerSeat = 0; // Default to seat 0
            } else {
                // Use the first occupied seat
                dealerSeat = occupiedSeats[0];
            }
            
            // Update the dealer seat in Firestore
            await groupRef.update({ dealerSeat: dealerSeat });
            App.dealerSeat = dealerSeat;
            console.log('Assigned as dealer, seat:', dealerSeat);
        } else {
            App.dealerSeat = currentDealerSeat;
            console.log('Current dealer is at seat:', currentDealerSeat);
        }
        
        // Find an available seat for the player
        const occupiedSeats = Object.keys(groupData?.gameState?.players || {}).map(s => parseInt(s));
        let availableSeat = -1;
        
        console.log('Current occupied seats:', occupiedSeats);
        
        for (let i = 0; i < 6; i++) {
            if (!occupiedSeats.includes(i)) {
                availableSeat = i;
                break;
            }
        }
        
        console.log('Available seat:', availableSeat);
        
        if (availableSeat === -1) {
            showMessage('The global room is full. Please try again later.');
            return;
        }
        
        App.playerSeat = availableSeat;
        
        // Add player to the global group
        const playerData = {
            id: App.currentUser.uid,
            name: App.currentUser.email.split('@')[0],
            seat: availableSeat,
            balance: App.currentUser.balance,
            currentBet: 0,
            folded: false,
            isAllIn: false,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await groupRef.update({
            [`gameState.players.${availableSeat}`]: playerData
        });
        
        App.isInGroup = true;
        App.isMultiplayer = true;
        
        showMessage(`Joined the global poker room! You are player ${availableSeat + 1}.`);
        
        // Subscribe to group game state changes
        subscribeToGroupState();
        
    } catch (error) {
        console.error('Error joining global group:', error);
        showMessage('Error joining the global room. Please try again.');
    }
}

async function leaveGlobalGroup() {
    if (!App.isInGroup) return;
    
    try {
        const groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        const groupDoc = await groupRef.get();
        
        if (groupDoc.exists) {
            const groupData = groupDoc.data();
            const players = { ...groupData.gameState?.players };
            // Convert seat number to string for consistent key access (Firestore stores keys as strings)
            const playerSeatKey = App.playerSeat.toString();
            delete players[playerSeatKey];
            
            const playerCount = Object.keys(players).length;
            
            // Check if the leaving player is the dealer
            const currentDealerSeat = groupData.dealerSeat !== undefined ? groupData.dealerSeat : -1;
            const isDealerLeaving = (App.playerSeat === currentDealerSeat);
            
            let updateData = {
                'gameState.players': players
            };
            
            if (playerCount === 0) {
                // Reset the game state if no players left
                updateData = {
                    'gameState.phase': 'waiting',
                    'gameState.pot': 0,
                    'gameState.communityCards': [],
                    'gameState.dealerCards': [],
                    'gameState.players': {},
                    'gameState.currentPlayerSeat': 0,
                    'dealerSeat': -1  // Reset dealer
                };
                App.dealerSeat = -1;
            } else if (isDealerLeaving) {
                // Rotate dealer to next player
                const sortedSeats = Object.keys(players).map(s => parseInt(s)).sort((a, b) => a - b);
                const leavingIndex = sortedSeats.indexOf(App.playerSeat);
                // Find next seat (wrapping around)
                const nextSeat = sortedSeats[(leavingIndex) % sortedSeats.length];
                updateData.dealerSeat = nextSeat;
                App.dealerSeat = nextSeat;
                showMessage('Dealer left. Button rotated to next player.');
            }
            
            await groupRef.update(updateData);
        }
        
        if (App.unsubscribeGameState) {
            App.unsubscribeGameState();
            App.unsubscribeGameState = null;
        }
        
        App.isInGroup = false;
        App.isMultiplayer = false;
        App.playerSeat = -1;
        
    } catch (error) {
        console.error('Error leaving global group:', error);
    }
}

function subscribeToGroupState() {
    const groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
    
    App.unsubscribeGameState = groupRef.onSnapshot((snapshot) => {
        if (!snapshot.exists) {
            showMessage('Global room does not exist.');
            return;
        }
        
        const groupData = snapshot.data();
        const gameState = groupData.gameState;
        const dealerSeat = groupData.dealerSeat !== undefined ? groupData.dealerSeat : -1;
        
        // Update local dealer seat if changed
        if (dealerSeat !== App.dealerSeat) {
            App.dealerSeat = dealerSeat;
            console.log('Dealer seat updated to:', dealerSeat);
        }
        
        console.log('Game state update:', gameState.phase, 'Players:', Object.keys(gameState.players || {}), 'Dealer:', dealerSeat);
        
        // Check if player is still in the group
        const playerSeatKey = App.playerSeat.toString();
        if (!gameState.players || !gameState.players[playerSeatKey]) {
            // Only show this message if we were previously in the group
            if (App.isInGroup) {
                App.isInGroup = false;
                showMessage('You have been removed from the global room.');
            }
            return;
        }
        
        // Initialize game regardless of phase
        if (!App.game) {
            App.game = new PokerGame({
                isMultiplayer: true,
                groupId: DEFAULT_GROUP_ID,
                onStateChange: handleGroupStateChange,
                onActionRequired: handleGroupActionRequired,
                onGameEnd: handleGroupGameEnd,
                onMessage: showMessage
            });
        }
        
        if (App.game) {
            App.game.updateState(gameState);
        }
        
        // Update players list
        updatePlayersList(gameState.players);
        
        // Check for turn
        const currentPlayerSeatKey = gameState.currentPlayerSeat.toString();
        const currentPlayer = gameState.players?.[currentPlayerSeatKey];
        if (currentPlayer && currentPlayer.id === App.currentUser.uid) {
            showTurnIndicator(currentPlayer.name);
        } else {
            hideTurnIndicator();
        }
        
        // Show/hide Start Game button based on dealer status and game phase
        updateStartGameButton(gameState.phase, dealerSeat);
        
        // Handle single player mode (AI dealer)
        const playerCount = Object.keys(gameState.players || {}).length;
        if (playerCount === 1 && gameState.phase === 'waiting') {
            // Single player - auto start with AI dealer
            startSinglePlayerGame();
        }
        
    }, (error) => {
        console.error('Firestore subscription error:', error);
    });
}

function updateStartGameButton(phase, dealerSeat) {
    if (!DOM.startGameBtn) return;
    
    // Show Start Game button only if:
    // 1. Game is in 'waiting' phase
    // 2. Current player is the dealer
    // 3. There are 2 or more players
    if (phase === 'waiting' && App.playerSeat === dealerSeat && App.isInGroup) {
        DOM.startGameBtn.classList.remove('hidden');
        DOM.startGameBtn.style.display = 'inline-block';
    } else {
        DOM.startGameBtn.classList.add('hidden');
        DOM.startGameBtn.style.display = 'none';
    }
}

async function startGameFromDealer() {
    try {
        const groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        const ante = 10; // Default ante
        
        // Get current game state
        const groupDoc = await groupRef.get();
        const groupData = groupDoc.data();
        const playerIds = Object.keys(groupData.gameState.players || {});
        
        if (playerIds.length < 2) {
            showMessage('Need at least 2 players to start a multiplayer game.');
            return;
        }
        
        // Create deck and shuffle
        const deck = createShuffledDeck();
        
        // Deal cards to all players
        const players = {};
        const dealerCards = [deck.pop(), deck.pop()];
        
        playerIds.forEach(seat => {
            const playerInfo = groupData.gameState.players[seat];
            players[seat] = {
                id: playerInfo.id,
                name: playerInfo.name,
                seat: parseInt(seat),
                balance: playerInfo.balance,
                cards: [deck.pop(), deck.pop()],
                currentBet: 0,
                folded: false,
                isAllIn: false
            };
        });
        
        // Determine first player to act (seat after dealer)
        const dealerSeatNum = parseInt(groupData.dealerSeat);
        const sortedSeats = playerIds.map(s => parseInt(s)).sort((a, b) => a - b);
        const dealerIndex = sortedSeats.indexOf(dealerSeatNum);
        const firstToAct = sortedSeats[(dealerIndex + 1) % sortedSeats.length];
        
        // Update game state
        await groupRef.update({
            'gameState.phase': 'preflop',
            'gameState.deck': deck,
            'gameState.dealerCards': dealerCards,
            'gameState.players': players,
            'gameState.pot': ante * playerIds.length,
            'gameState.communityCards': [],
            'gameState.currentPlayerSeat': firstToAct,
            'gameState.minRaise': ante * 2,
            'gameState.dealerSeat': groupData.dealerSeat  // Keep dealer seat
        });
        
        // Hide start button
        if (DOM.startGameBtn) {
            DOM.startGameBtn.classList.add('hidden');
            DOM.startGameBtn.style.display = 'none';
        }
        
        showMessage('Game started! Good luck!');
        
    } catch (error) {
        console.error('Error starting game from dealer:', error);
        showMessage('Error starting the game. Please try again.');
    }
}

async function rotateDealerButton() {
    try {
        const groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        const groupDoc = await groupRef.get();
        const groupData = groupDoc.data();
        
        const playerSeats = Object.keys(groupData.gameState.players || {}).map(s => parseInt(s)).sort((a, b) => a - b);
        
        if (playerSeats.length === 0) {
            // No players, reset dealer
            await groupRef.update({ dealerSeat: -1 });
            App.dealerSeat = -1;
            return;
        }
        
        // Find next dealer (seat after current dealer)
        const currentDealer = groupData.dealerSeat !== undefined ? groupData.dealerSeat : playerSeats[0];
        const currentIndex = playerSeats.indexOf(currentDealer);
        const nextDealer = playerSeats[(currentIndex + 1) % playerSeats.length];
        
        await groupRef.update({ dealerSeat: nextDealer });
        App.dealerSeat = nextDealer;
        
        showMessage(`Dealer button rotated to Player ${nextDealer + 1}`);
        
    } catch (error) {
        console.error('Error rotating dealer button:', error);
    }
}

function createShuffledDeck() {
    const deck = [];
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(rank + suit);
        }
    }
    
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
}

// ============================================
// Game State Handlers
// ============================================
function handleGroupStateChange(state) {
    updatePhaseDisplay(state.phase);
    updatePotDisplay(state.pot);
    
    // Update community cards
    state.communityCards.forEach((card, index) => {
        if (DOM.communityCards[index]) {
            DOM.communityCards[index].textContent = card;
            DOM.communityCards[index].className = 'card';
        }
    });
    
    // Update dealer cards
    state.dealerCards.forEach((card, index) => {
        if (DOM.dealerCards[index]) {
            DOM.dealerCards[index].textContent = card;
            DOM.dealerCards[index].className = 'card';
        }
    });
    
    // Convert players object to array for iteration
    const playersArray = Object.values(state.players || {});

    // Update player's own cards
    const playerData = playersArray.find(p => p.id === App.currentUser.uid);
    if (playerData) {
        if (playerData.cards) {
            playerData.cards.forEach((card, index) => {
                if (DOM.playerCards[index]) {
                    DOM.playerCards[index].textContent = card;
                    DOM.playerCards[index].className = 'card';
                }
            });
        }
    }

    // Update betting controls for current player
    const currentPlayerSeatKey = state.currentPlayerSeat.toString();
    const currentPlayer = state.players[currentPlayerSeatKey];
    if (currentPlayer && currentPlayer.id === App.currentUser.uid && !currentPlayer.folded) {
        const myBet = currentPlayer.currentBet || 0;
        const maxBet = Math.max(...playersArray.map(p => p.currentBet || 0));
        const canCheck = myBet === maxBet;
        
        updateBettingControls(canCheck, myBet, state.minRaise);
    } else {
        updateBettingControls(false, 0, 0);
    }
}

function handleGroupActionRequired(state) {
    const currentPlayerSeatKey = state.currentPlayerSeat.toString();
    const currentPlayer = state.players[currentPlayerSeatKey];
    if (currentPlayer) {
        showTurnIndicator(currentPlayer.name);
    }
}

function updatePlayersList(players) {
    if (!DOM.playersList) return;
    
    let html = '<h4>Players Online</h4>';
    Object.values(players || {}).forEach(player => {
        const isCurrentPlayer = player.id === App.currentUser.uid;
        const status = player.folded ? '(Folded)' : (player.isAllIn ? '(All-In)' : '');
        html += `
            <div class="player-item ${isCurrentPlayer ? 'current' : ''}">
                <span>${player.name} ${isCurrentPlayer ? '(You)' : ''} ${status}</span>
                <span>$${player.balance || 0}</span>
            </div>
        `;
    });
    
    DOM.playersList.innerHTML = html;
}

// ============================================
// Game Interface Management
// ============================================
function showLoginModal() {
    // Safely show login modal
    if (DOM.loginModal) {
        DOM.loginModal.classList.remove('hidden');
        DOM.loginModal.style.display = 'flex';
    }
    if (DOM.gameApp) {
        DOM.gameApp.classList.add('hidden');
        DOM.gameApp.style.display = 'none';
    }
    
    // Clear form fields safely
    if (DOM.authError) {
        DOM.authError.textContent = '';
        DOM.authError.style.display = 'none';
    }
    if (DOM.emailInput) DOM.emailInput.value = '';
    if (DOM.passwordInput) DOM.passwordInput.value = '';
}

function showGameInterface() {
    console.log('showGameInterface called');
    
    // Hide login modal completely with aggressive styling
    if (DOM.loginModal) {
        console.log('Found loginModal, hiding it');
        DOM.loginModal.classList.add('hidden');
        DOM.loginModal.style.display = 'none !important';
        DOM.loginModal.style.visibility = 'hidden';
        DOM.loginModal.style.opacity = '0';
        DOM.loginModal.style.pointerEvents = 'none';
        DOM.loginModal.style.zIndex = '-1';
    } else {
        console.log('loginModal not found');
    }
    
    // Show game app with aggressive styling
    if (DOM.gameApp) {
        console.log('Found gameApp, showing it');
        
        // Remove hidden class and prevent it from being added back
        DOM.gameApp.classList.remove('hidden');
        
        // Create a MutationObserver to watch for class changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (DOM.gameApp.classList.contains('hidden')) {
                        console.log('Warning: hidden class was added, removing it');
                        DOM.gameApp.classList.remove('hidden');
                    }
                }
            });
        });
        
        observer.observe(DOM.gameApp, { attributes: true });
        
        // Set display properties
        DOM.gameApp.style.display = 'flex';
        DOM.gameApp.style.visibility = 'visible';
        DOM.gameApp.style.opacity = '1';
        DOM.gameApp.style.zIndex = '1';
        
        // Force show all game elements for debugging
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.display = 'flex';
        }
        
        const pokerTable = document.querySelector('.poker-table');
        if (pokerTable) {
            pokerTable.style.backgroundColor = '#8B0000'; // Red background for visibility
            pokerTable.style.minHeight = '400px';
            console.log('Set poker-table to red background for debugging');
        }
        
        // Log computed styles for debugging
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(DOM.gameApp);
            console.log('gameApp display:', computedStyle.display);
            console.log('gameApp height:', computedStyle.height);
            console.log('gameApp visibility:', computedStyle.visibility);
            console.log('gameApp opacity:', computedStyle.opacity);
            console.log('gameApp classList:', DOM.gameApp.classList.toString());
            console.log('gameApp actual visibility:', DOM.gameApp.style.visibility);
            console.log('gameApp actual display:', DOM.gameApp.style.display);
        }, 100);
    } else {
        console.log('gameApp not found');
    }
    
    if (DOM.logoutBtn) DOM.logoutBtn.style.display = 'block';
    
    updateBalanceDisplay();
    
    // Hide room-specific UI elements
    if (DOM.playersList) DOM.playersList.style.display = 'block';
    
    // Automatically join the global group
    joinGlobalGroup();
}

function updateBalanceDisplay() {
    if (DOM.balanceDisplay) {
        DOM.balanceDisplay.textContent = `Balance: $${App.currentUser?.balance || 0}`;
    }
}

function showAuthError(message) {
    // Safely show error message
    if (DOM.authError) {
        DOM.authError.textContent = message;
        DOM.authError.style.display = 'block';
    }
    // Also log to console for debugging
    console.warn('Auth error:', message);
}

function showMessage(message) {
    if (DOM.messageCenter) {
        DOM.messageCenter.innerHTML = `<p>${message}</p>`;
        DOM.messageCenter.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            DOM.messageCenter.style.display = 'none';
        }, 5000);
    }
}

function updatePhaseDisplay(phase) {
    if (DOM.phaseIndicator) {
        const phaseNames = {
            'preflop': 'Pre-Flop',
            'flop': 'Flop',
            'turn': 'Turn',
            'river': 'River',
            'showdown': 'Showdown',
            'waiting': 'Waiting for Players'
        };
        DOM.phaseIndicator.textContent = phaseNames[phase] || phase;
    }
}

function updatePotDisplay(amount) {
    if (DOM.potDisplay) {
        DOM.potDisplay.textContent = `Pot: $${amount || 0}`;
    }
}

function updateBettingControls(canCheck, currentBet, minRaise) {
    if (DOM.checkBtn) {
        DOM.checkBtn.disabled = !canCheck;
    }
    if (DOM.callBtn) {
        DOM.callBtn.disabled = currentBet === 0;
    }
    if (DOM.raiseBtn) {
        DOM.raiseBtn.disabled = currentBet === 0;
    }
    if (DOM.allInBtn) {
        DOM.allInBtn.disabled = App.currentUser?.balance <= 0;
    }
    if (DOM.raiseInput) {
        DOM.raiseInput.min = minRaise;
        DOM.raiseInput.placeholder = `Min: $${minRaise}`;
    }
}

function showTurnIndicator(playerName) {
    if (DOM.turnIndicator) {
        DOM.turnIndicator.textContent = `${playerName}'s Turn`;
        DOM.turnIndicator.style.display = 'block';
    }
}

function hideTurnIndicator() {
    if (DOM.turnIndicator) {
        DOM.turnIndicator.style.display = 'none';
    }
}

// ============================================
// Reset Room Function
// ============================================
async function resetRoom() {
    if (!confirm('Are you sure you want to reset the room? This will clear all players and restart the game.')) {
        return;
    }
    
    try {
        const groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        
        // Reset the entire room state
        await groupRef.set({
            name: 'Global Poker Room',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            gameState: {
                phase: 'waiting',
                pot: 0,
                communityCards: [],
                players: {},
                dealerCards: []
            },
            dealerSeat: -1
        }, { merge: true });
        
        // Reset local state
        App.isInGroup = false;
        App.isMultiplayer = false;
        App.playerSeat = -1;
        App.dealerSeat = -1;
        App.game = null;
        
        if (App.unsubscribeGameState) {
            App.unsubscribeGameState();
            App.unsubscribeGameState = null;
        }
        
        showMessage('Room has been reset. Please rejoin.');
        
        // Automatically rejoin
        setTimeout(() => {
            joinGlobalGroup();
        }, 1000);
        
    } catch (error) {
        console.error('Error resetting room:', error);
        showMessage('Error resetting room. Please try again.');
    }
}

// ============================================
// Single Player Fallback
// ============================================
function startSinglePlayerGame() {
    App.isMultiplayer = false;
    
    // Hide multiplayer UI
    if (DOM.playersList) DOM.playersList.style.display = 'none';
    
    // Initialize the game with AI dealer
    App.game = new PokerGame({
        isMultiplayer: false,
        onStateChange: handleGameStateChange,
        onActionRequired: handleActionRequired,
        onGameEnd: handleGameEnd,
        onMessage: showMessage
    });
    
    App.game.start();
}

function handleGameStateChange(state) {
    updatePhaseDisplay(state.phase);
    updatePotDisplay(state.pot);
    
    // Update community cards
    state.communityCards.forEach((card, index) => {
        if (DOM.communityCards[index]) {
            DOM.communityCards[index].textContent = card;
            DOM.communityCards[index].className = 'card';
        }
    });
    
    // Update player cards
    state.playerCards.forEach((card, index) => {
        if (DOM.playerCards[index]) {
            DOM.playerCards[index].textContent = card;
            DOM.playerCards[index].className = 'card';
        }
    });
    
    // Update dealer cards
    state.dealerCards.forEach((card, index) => {
        if (DOM.dealerCards[index]) {
            DOM.dealerCards[index].textContent = card;
            DOM.dealerCards[index].className = 'card';
        }
    });
    
    // Update betting controls
    updateBettingControls(state.canCheck, state.currentBet, state.minRaise);
    
    // Update balance display
    if (state.playerBalance !== undefined) {
        App.currentUser.balance = state.playerBalance;
        updateBalanceDisplay();
    }
}

function handleActionRequired(state) {
    showTurnIndicator(state.currentPlayer);
    updateBettingControls(state.canCheck, state.currentBet, state.minRaise);
    
    // Auto-show dealer cards on showdown
    if (state.phase === 'showdown') {
        state.dealerCards.forEach((card, index) => {
            if (DOM.dealerCards[index]) {
                DOM.dealerCards[index].textContent = card;
                DOM.dealerCards[index].className = 'card';
            }
        });
    }
}

function handleGameEnd(result) {
    hideTurnIndicator();
    
    let message = '';
    if (result.winner === 'player') {
        message = `You won $${result.amount}! Your hand: ${result.handDescription}`;
    } else if (result.winner === 'dealer') {
        message = `Dealer wins with ${result.handDescription}`;
    } else if (result.winner === 'split') {
        message = `Split pot! You get $${result.amount}`;
    } else if (result.winner === 'fold') {
        message = `You folded. Dealer wins the pot.`;
    }
    
    showMessage(message);
    
    // Update user balance
    if (result.amount !== undefined) {
        updateUserBalance(result.amount);
    }
    
    // Start new hand after delay
    setTimeout(() => {
        if (App.game && !App.isMultiplayer) {
            App.game.startNewHand();
        }
    }, 3000);
}

// ============================================
// Utility Functions
// ============================================
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'Operation not allowed',
        'auth/weak-password': 'Password is too weak',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/popup-closed-by-user': 'Sign-in popup was closed',
        'auth/cancelled-popup-request': 'Sign-in was cancelled',
        'auth/unauthorized-domain': 'This domain is not authorized. Please check Firebase console settings.'
    };
    
    return messages[errorCode] || 'An error occurred. Please try again.';
}

// ============================================
// Keyboard Shortcuts
// ============================================
document.addEventListener('keydown', (e) => {
    if (!App.game || App.isMultiplayer) return;
    
    switch(e.key.toLowerCase()) {
        case 'f':
            App.game.playerAction('fold');
            break;
        case 'c':
            App.game.playerAction('check');
            break;
        case 'r':
            if (DOM.raiseInput) DOM.raiseInput.focus();
            break;
        case 'a':
            App.game.playerAction('allin');
            break;
        case 'enter':
            if (document.activeElement === DOM.raiseInput) {
                const amount = parseInt(DOM.raiseInput.value) || 0;
                App.game.playerAction('raise', amount);
            }
            break;
    }
});
