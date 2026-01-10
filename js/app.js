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
    isInGroup: false
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
        await window.firebaseReadyPromise;
    }
    
    initializeDOMElements();
    setupEventListeners();
    setupFirebaseAuth();
    
    // Check for saved session
    const user = firebase.auth().currentUser;
    if (user) {
        await loadUserData(user.uid);  // Pass user.uid, not the user object
    } else {
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
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Auth Events
    DOM.registerBtn.addEventListener('click', handleRegister);
    DOM.loginBtn.addEventListener('click', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.googleLoginBtn.addEventListener('click', handleGoogleLogin);
    DOM.emailLoginBtn.addEventListener('click', toggleEmailAuth);
    
    // Game Action Events
    DOM.foldBtn.addEventListener('click', () => App.game?.playerAction('fold'));
    DOM.checkBtn.addEventListener('click', () => App.game?.playerAction('check'));
    DOM.callBtn.addEventListener('click', () => App.game?.playerAction('call'));
    DOM.raiseBtn.addEventListener('click', () => App.game?.playerAction('raise', parseInt(DOM.raiseInput.value) || 0));
    DOM.allInBtn.addEventListener('click', () => App.game?.playerAction('allin'));
    
    // Raise input validation
    DOM.raiseInput?.addEventListener('input', () => {
        const raiseAmount = parseInt(DOM.raiseInput.value) || 0;
        if (raiseAmount > App.currentUser?.balance) {
            DOM.raiseInput.value = App.currentUser?.balance || 0;
        }
    });
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
        // Validate uid is a non-empty string
        if (!uid || typeof uid !== 'string' || uid.trim() === '') {
            console.error('Invalid uid:', uid);
            if (DOM.authError) {
                DOM.authError.textContent = 'Invalid user ID. Please sign in again.';
                DOM.authError.style.display = 'block';
            }
            return;
        }
        
        // Use the email from the current user if already set (from Google login)
        const userEmail = App.currentUser?.email || 
                         (DOM.emailInput?.value && DOM.emailInput.value.trim() !== '' ? DOM.emailInput.value : 'Player');
        
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
        
        showGameInterface();
    } catch (error) {
        console.error('Error loading user data:', error);
        // Show error safely - handle null authError
        if (DOM.authError) {
            DOM.authError.textContent = 'Error loading account data. Please try again.';
            DOM.authError.style.display = 'block';
        } else {
            alert('Error loading account data. Please try again.');
        }
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
        const groupDoc = await groupRef.get();
        
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
                }
            });
        }
        
        // Find an available seat
        const groupData = groupDoc.data();
        const occupiedSeats = Object.keys(groupData?.gameState?.players || {}).map(s => parseInt(s));
        let availableSeat = -1;
        
        for (let i = 0; i < 6; i++) {
            if (!occupiedSeats.includes(i)) {
                availableSeat = i;
                break;
            }
        }
        
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
            delete players[App.playerSeat];
            
            const playerCount = Object.keys(players).length;
            
            if (playerCount === 0) {
                // Reset the game state if no players left
                await groupRef.update({
                    'gameState.phase': 'waiting',
                    'gameState.pot': 0,
                    'gameState.communityCards': [],
                    'gameState.dealerCards': [],
                    'gameState.players': {},
                    'gameState.currentPlayerSeat': 0
                });
            } else {
                await groupRef.update({
                    'gameState.players': players
                });
            }
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
    
    App.unsubscribeGameState = groupRef.onSnapshot(async (snapshot) => {
        if (!snapshot.exists) {
            showMessage('Global room does not exist.');
            return;
        }
        
        const groupData = snapshot.data();
        const gameState = groupData.gameState;
        
        // Check if player is still in the group
        if (!gameState.players || !gameState.players[App.playerSeat]) {
            App.isInGroup = false;
            showMessage('You have been removed from the global room.');
            return;
        }
        
        // Initialize game if not already done
        if (gameState.phase !== 'waiting' && !App.game) {
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
        const currentPlayer = gameState.players[gameState.currentPlayerSeat];
        if (currentPlayer && currentPlayer.id === App.currentUser.uid) {
            showTurnIndicator(currentPlayer.name);
        } else {
            hideTurnIndicator();
        }
    });
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
    
    // Update player's own cards
    const playerIndex = state.players.findIndex(p => p.id === App.currentUser.uid);
    if (playerIndex >= 0) {
        const player = state.players[playerIndex];
        if (player.cards) {
            player.cards.forEach((card, index) => {
                if (DOM.playerCards[index]) {
                    DOM.playerCards[index].textContent = card;
                    DOM.playerCards[index].className = 'card';
                }
            });
        }
    }
    
    // Update betting controls for current player
    const currentPlayer = state.players[state.currentPlayerSeat];
    if (currentPlayer && currentPlayer.id === App.currentUser.uid && !currentPlayer.folded) {
        const myBet = currentPlayer.currentBet || 0;
        const maxBet = Math.max(...state.players.map(p => p.currentBet || 0));
        const canCheck = myBet === maxBet;
        
        updateBettingControls(canCheck, myBet, state.minRaise);
    } else {
        updateBettingControls(false, 0, 0);
    }
}

function handleGroupActionRequired(state) {
    const currentPlayer = state.players[state.currentPlayerSeat];
    if (currentPlayer) {
        showTurnIndicator(currentPlayer.name);
    }
}

function handleGroupGameEnd(result) {
    hideTurnIndicator();
    
    let message = '';
    if (result.winner === App.currentUser.uid) {
        message = `You won $${result.amount}!`;
    } else if (result.winnerName) {
        message = `${result.winnerName} wins $${result.amount}`;
    } else if (result.winner === 'split') {
        message = `Split pot! You get $${result.amount}`;
    }
    
    showMessage(message);
    
    // Update balance if player won
    if (result.payouts && result.payouts[App.currentUser.uid]) {
        updateUserBalance(result.payouts[App.currentUser.uid]);
    }
    
    // Update local balance from server state
    const player = result.players?.find(p => p.id === App.currentUser.uid);
    if (player) {
        App.currentUser.balance = player.balance;
        updateBalanceDisplay();
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
    if (DOM.loginModal) DOM.loginModal.style.display = 'flex';
    if (DOM.gameApp) DOM.gameApp.style.display = 'none';
    
    // Clear form fields safely
    if (DOM.authError) {
        DOM.authError.textContent = '';
        DOM.authError.style.display = 'none';
    }
    if (DOM.emailInput) DOM.emailInput.value = '';
    if (DOM.passwordInput) DOM.passwordInput.value = '';
}

function showGameInterface() {
    if (DOM.loginModal) DOM.loginModal.style.display = 'none';
    if (DOM.gameApp) DOM.gameApp.style.display = 'block';
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
