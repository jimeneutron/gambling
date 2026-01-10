/**
 * Poker Game - Main Application Controller
 * Handles Firebase authentication, multiplayer state management, and UI updates
 */

// Constants
const DEFAULT_GROUP_ID = 'global_default_group';
const MIN_PLAYERS_TO_START = 2;

// Application State
const App = {
    currentUser: null,
    game: null,
    isMultiplayer: false,
    unsubscribeGameState: null,
    playerSeat: -1,
    isInGroup: false,
    dealerSeat: -1
};

// Export to window for other modules
window.App = App;

// DOM Elements
const DOM = {
    loginModal: null,
    gameApp: null,
    emailInput: null,
    passwordInput: null,
    registerBtn: null,
    loginBtn: null,
    logoutBtn: null,
    googleLoginBtn: null,
    emailLoginBtn: null,
    authError: null,
    emailAuthSection: null,
    potDisplay: null,
    phaseIndicator: null,
    phaseText: null,
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
    turnIndicator: null,
    startGameBtn: null,
    resetRoomBtn: null,
    playersList: null,
    playerCards: [],
    communityCards: [],
    dealerCards: []
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    initializeDOMElements();
    setupEventListeners();
    
    // Wait for Firebase
    if (window.firebaseReadyPromise) {
        try {
            await window.firebaseReadyPromise;
        } catch (e) {
            console.warn('Firebase not available');
        }
    }
    
    // Check if Firebase is ready
    var isFirebaseReady = window.firebase && 
                          typeof window.firebase.auth === 'function' &&
                          typeof window.firebase.firestore === 'function' &&
                          window.firebase.apps && 
                          window.firebase.apps.length > 0;
    
    if (isFirebaseReady) {
        setupFirebaseAuth();
        var user = firebase.auth().currentUser;
        if (user) {
            await loadUserData(user.uid);
        } else {
            showLoginModal();
        }
    } else {
        showLoginModal();
    }
});

function initializeDOMElements() {
    // Auth elements
    DOM.loginModal = document.getElementById('loginModal');
    DOM.gameApp = document.getElementById('gameApp');
    DOM.emailInput = document.getElementById('emailInput');
    DOM.passwordInput = document.getElementById('passwordInput');
    DOM.registerBtn = document.getElementById('registerBtn');
    DOM.loginBtn = document.getElementById('loginBtn');
    DOM.logoutBtn = document.getElementById('logoutBtn');
    DOM.googleLoginBtn = document.getElementById('googleLoginBtn');
    DOM.emailLoginBtn = document.getElementById('emailLoginBtn');
    DOM.authError = document.getElementById('authError');
    DOM.emailAuthSection = document.getElementById('emailAuthSection');
    
    // Game elements
    DOM.potDisplay = document.getElementById('potDisplay');
    DOM.phaseIndicator = document.getElementById('phaseIndicator');
    DOM.phaseText = document.getElementById('phaseText');
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
    DOM.turnIndicator = document.getElementById('turnIndicator');
    DOM.startGameBtn = document.getElementById('startGameBtn');
    DOM.resetRoomBtn = document.getElementById('resetRoomBtn');
    DOM.playersList = document.getElementById('playersList');
    
    // Card elements
    DOM.playerCards[0] = document.getElementById('playerCard0');
    DOM.playerCards[1] = document.getElementById('playerCard1');
    DOM.communityCards[0] = document.getElementById('communityCard0');
    DOM.communityCards[1] = document.getElementById('communityCard1');
    DOM.communityCards[2] = document.getElementById('communityCard2');
    DOM.communityCards[3] = document.getElementById('communityCard3');
    DOM.communityCards[4] = document.getElementById('communityCard4');
    DOM.dealerCards[0] = document.getElementById('dealerCard0');
    DOM.dealerCards[1] = document.getElementById('dealerCard1');
}

function setupEventListeners() {
    // Auth events
    if (DOM.registerBtn) DOM.registerBtn.addEventListener('click', handleRegister);
    if (DOM.loginBtn) DOM.loginBtn.addEventListener('click', handleLogin);
    if (DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', handleLogout);
    if (DOM.googleLoginBtn) DOM.googleLoginBtn.addEventListener('click', handleGoogleLogin);
    if (DOM.emailLoginBtn) DOM.emailLoginBtn.addEventListener('click', toggleEmailAuth);
    
    // Game action events
    if (DOM.foldBtn) DOM.foldBtn.addEventListener('click', function() { if (App.game) App.game.playerAction('fold'); });
    if (DOM.checkBtn) DOM.checkBtn.addEventListener('click', function() { if (App.game) App.game.playerAction('check'); });
    if (DOM.callBtn) DOM.callBtn.addEventListener('click', function() { if (App.game) App.game.playerAction('call'); });
    if (DOM.raiseBtn) DOM.raiseBtn.addEventListener('click', function() { 
        if (App.game && DOM.raiseInput) {
            var amount = parseInt(DOM.raiseInput.value) || 0;
            App.game.playerAction('raise', amount);
        }
    });
    if (DOM.allInBtn) DOM.allInBtn.addEventListener('click', function() { if (App.game) App.game.playerAction('allin'); });
    
    if (DOM.raiseInput) {
        DOM.raiseInput.addEventListener('input', function() {
            var raiseAmount = parseInt(DOM.raiseInput.value) || 0;
            if (raiseAmount > (App.currentUser && App.currentUser.balance ? App.currentUser.balance : 0)) {
                DOM.raiseInput.value = App.currentUser && App.currentUser.balance ? App.currentUser.balance : 0;
            }
        });
    }
    
    // Dealer button
    if (DOM.startGameBtn) DOM.startGameBtn.addEventListener('click', startGameFromDealer);
    if (DOM.resetRoomBtn) DOM.resetRoomBtn.addEventListener('click', resetRoom);
    
    // Keyboard shortcuts (single-player only)
    document.addEventListener('keydown', function(e) {
        if (!App.game || App.isMultiplayer) return;
        
        switch(e.key.toLowerCase()) {
            case 'f': App.game.playerAction('fold'); break;
            case 'c': App.game.playerAction('check'); break;
            case 'a': App.game.playerAction('allin'); break;
        }
    });
}

// Firebase Authentication
function setupFirebaseAuth() {
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user && user.emailVerified) {
            await loadUserData(user.uid);
        } else {
            showLoginModal();
        }
    });
}

async function handleRegister() {
    var email = DOM.emailInput ? DOM.emailInput.value : '';
    var password = DOM.passwordInput ? DOM.passwordInput.value : '';
    
    if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
    }
    
    try {
        var userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await firebase.auth().currentUser.sendEmailVerification();
        showMessage('Registration successful! Please check your email to verify.');
        await firebase.auth().signOut();
    } catch (error) {
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function handleLogin() {
    var email = DOM.emailInput ? DOM.emailInput.value : '';
    var password = DOM.passwordInput ? DOM.passwordInput.value : '';
    
    try {
        var userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        if (!userCredential.user.emailVerified) {
            showAuthError('Please verify your email before logging in');
            await firebase.auth().signOut();
            return;
        }
        await loadUserData(userCredential.user.uid);
    } catch (error) {
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function handleGoogleLogin() {
    try {
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        var userCredential = await firebase.auth().signInWithPopup(provider);
        if (!userCredential.user.emailVerified) {
            showAuthError('Please verify your Google email before logging in');
            await firebase.auth().signOut();
            return;
        }
        await loadUserData(userCredential.user.uid);
    } catch (error) {
        showAuthError(getAuthErrorMessage(error.code));
    }
}

function toggleEmailAuth() {
    if (DOM.emailAuthSection) {
        DOM.emailAuthSection.classList.toggle('hidden');
    }
}

async function handleLogout() {
    await leaveGlobalGroup();
    if (App.game) {
        App.game.cleanup();
        App.game = null;
    }
    if (App.unsubscribeGameState) {
        App.unsubscribeGameState();
        App.unsubscribeGameState = null;
    }
    App.isMultiplayer = false;
    await firebase.auth().signOut();
    showLoginModal();
}

// User Data Management
async function loadUserData(uid) {
    if (!uid || typeof uid !== 'string') {
        createDefaultUser();
        showGameInterface();
        return;
    }
    
    try {
        var userDoc = await firebase.firestore().collection('users').doc(uid.trim()).get();
        
        if (userDoc.exists) {
            var data = userDoc.data();
            App.currentUser = {
                uid: uid.trim(),
                email: data.email || 'Player',
                balance: typeof data.balance === 'number' ? data.balance : 1000,
                totalWinnings: data.totalWinnings || 0,
                gamesPlayed: data.gamesPlayed || 0
            };
        } else {
            // Create new user
            var userEmail = (DOM.emailInput && DOM.emailInput.value) ? DOM.emailInput.value : 'Player';
            App.currentUser = {
                uid: uid.trim(),
                email: userEmail,
                balance: 1000,
                totalWinnings: 0,
                gamesPlayed: 0
            };
            await saveUserData(uid.trim(), App.currentUser);
        }
        showGameInterface();
    } catch (error) {
        createDefaultUser();
        showGameInterface();
    }
}

function createDefaultUser() {
    App.currentUser = {
        uid: 'unknown',
        email: 'Player',
        balance: 1000,
        totalWinnings: 0,
        gamesPlayed: 0
    };
}

async function saveUserData(uid, data) {
    try {
        await firebase.firestore().collection('users').doc(uid).set(data, { merge: true });
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Group Management
async function joinGlobalGroup() {
    if (App.isInGroup) return;
    
    try {
        var groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        var groupDoc = await groupRef.get();
        
        if (!groupDoc.exists) {
            // Create global group
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
            });
            groupDoc = await groupRef.get();
        }
        
        var groupData = groupDoc.data();
        var players = groupData.gameState ? groupData.gameState.players : {};
        
        // Handle dealer assignment
        var currentDealerSeat = groupData.dealerSeat !== undefined ? groupData.dealerSeat : -1;
        
        if (currentDealerSeat === -1) {
            // First player becomes dealer
            currentDealerSeat = 0;
            await groupRef.update({ dealerSeat: currentDealerSeat });
        }
        App.dealerSeat = currentDealerSeat;
        
        // Find available seat
        var occupiedSeats = Object.keys(players).map(function(s) { return parseInt(s); });
        var availableSeat = -1;
        
        for (var i = 0; i < 6; i++) {
            if (occupiedSeats.indexOf(i) === -1) {
                availableSeat = i;
                break;
            }
        }
        
        if (availableSeat === -1) {
            showMessage('The room is full.');
            return;
        }
        
        App.playerSeat = availableSeat;
        
        // Add player
        var playerData = {
            id: App.currentUser.uid,
            name: App.currentUser.email.split('@')[0],
            seat: availableSeat,
            balance: App.currentUser.balance,
            currentBet: 0,
            folded: false,
            isAllIn: false
        };
        
        var updateData = {};
        updateData['gameState.players.' + availableSeat] = playerData;
        
        await groupRef.update(updateData);
        
        App.isInGroup = true;
        App.isMultiplayer = true;
        
        showMessage('Joined the global poker room!');
        subscribeToGroupState();
        
    } catch (error) {
        console.error('Error joining group:', error);
        showMessage('Error joining the room.');
    }
}

async function leaveGlobalGroup() {
    if (!App.isInGroup) return;
    
    try {
        var groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        var groupDoc = await groupRef.get();
        
        if (groupDoc.exists) {
            var groupData = groupDoc.data();
            var players = Object.assign({}, groupData.gameState ? groupData.gameState.players : {});
            
            // Remove player using string key
            var playerSeatKey = App.playerSeat.toString();
            delete players[playerSeatKey];
            
            var playerCount = Object.keys(players).length;
            var currentDealerSeat = groupData.dealerSeat !== undefined ? groupData.dealerSeat : -1;
            var isDealerLeaving = (App.playerSeat === currentDealerSeat);
            
            var updateData = { 'gameState.players': players };
            
            if (playerCount === 0) {
                // Reset room
                updateData = {
                    'gameState.phase': 'waiting',
                    'gameState.pot': 0,
                    'gameState.communityCards': [],
                    'gameState.players': {},
                    'gameState.dealerCards': [],
                    'dealerSeat': -1
                };
                App.dealerSeat = -1;
            } else if (isDealerLeaving) {
                // Rotate dealer
                var sortedSeats = Object.keys(players).map(function(s) { return parseInt(s); }).sort(function(a, b) { return a - b; });
                var leavingIndex = sortedSeats.indexOf(App.playerSeat);
                var nextSeat = sortedSeats[(leavingIndex) % sortedSeats.length];
                updateData.dealerSeat = nextSeat;
                App.dealerSeat = nextSeat;
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
        console.error('Error leaving group:', error);
    }
}

function subscribeToGroupState() {
    var groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
    
    App.unsubscribeGameState = groupRef.onSnapshot(function(snapshot) {
        if (!snapshot.exists) {
            showMessage('Room does not exist.');
            return;
        }
        
        var groupData = snapshot.data();
        var gameState = groupData.gameState;
        
        // Update dealer seat
        if (groupData.dealerSeat !== undefined && groupData.dealerSeat !== App.dealerSeat) {
            App.dealerSeat = groupData.dealerSeat;
        }
        
        // Check if player is still in the room
        var playerSeatKey = App.playerSeat.toString();
        if (!gameState.players || !gameState.players[playerSeatKey]) {
            if (App.isInGroup) {
                App.isInGroup = false;
                showMessage('You have been removed from the room.');
            }
            return;
        }
        
        // Initialize game
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
        
        // Update UI
        updatePlayersList(gameState.players);
        
        var currentPlayerKey = gameState.currentPlayerSeat ? gameState.currentPlayerSeat.toString() : '';
        var currentPlayer = gameState.players ? gameState.players[currentPlayerKey] : null;
        if (currentPlayer && currentPlayer.id === App.currentUser.uid) {
            showTurnIndicator(currentPlayer.name);
        } else {
            hideTurnIndicator();
        }
        
        updateStartGameButton(gameState.phase);
        
        // Single player fallback
        var playerCount = gameState.players ? Object.keys(gameState.players).length : 0;
        if (playerCount === 1 && gameState.phase === 'waiting') {
            startSinglePlayerGame();
        }
        
    }, function(error) {
        console.error('Firestore error:', error);
    });
}

function updateStartGameButton(phase) {
    if (!DOM.startGameBtn) return;
    
    if (phase === 'waiting' && App.playerSeat === App.dealerSeat && App.isInGroup) {
        DOM.startGameBtn.classList.remove('hidden');
        DOM.startGameBtn.style.display = 'inline-block';
    } else {
        DOM.startGameBtn.classList.add('hidden');
        DOM.startGameBtn.style.display = 'none';
    }
}

async function startGameFromDealer() {
    try {
        var groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        var groupDoc = await groupRef.get();
        var groupData = groupDoc.data();
        
        var playerIds = Object.keys(groupData.gameState.players || {});
        
        if (playerIds.length < 2) {
            showMessage('Need at least 2 players to start.');
            return;
        }
        
        var deck = createShuffledDeck();
        var dealerCards = [deck.pop(), deck.pop()];
        
        var players = {};
        playerIds.forEach(function(seat) {
            var playerInfo = groupData.gameState.players[seat];
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
        
        // Determine first player (seat after dealer)
        var dealerSeatNum = parseInt(groupData.dealerSeat);
        var sortedSeats = playerIds.map(function(s) { return parseInt(s); }).sort(function(a, b) { return a - b; });
        var dealerIndex = sortedSeats.indexOf(dealerSeatNum);
        var firstToAct = sortedSeats[(dealerIndex + 1) % sortedSeats.length];
        
        await groupRef.update({
            'gameState.phase': 'preflop',
            'gameState.deck': deck,
            'gameState.dealerCards': dealerCards,
            'gameState.players': players,
            'gameState.pot': 20, // Small blind ante
            'gameState.communityCards': [],
            'gameState.currentPlayerSeat': firstToAct,
            'gameState.minRaise': 20
        });
        
        if (DOM.startGameBtn) {
            DOM.startGameBtn.classList.add('hidden');
            DOM.startGameBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error starting game:', error);
        showMessage('Error starting the game.');
    }
}

async function resetRoom() {
    if (!confirm('Reset the room? All players will be removed.')) return;
    
    try {
        var groupRef = firebase.firestore().collection('groups').doc(DEFAULT_GROUP_ID);
        
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
        
        App.isInGroup = false;
        App.isMultiplayer = false;
        App.playerSeat = -1;
        App.dealerSeat = -1;
        App.game = null;
        
        if (App.unsubscribeGameState) {
            App.unsubscribeGameState();
            App.unsubscribeGameState = null;
        }
        
        showMessage('Room has been reset.');
        setTimeout(function() { joinGlobalGroup(); }, 1000);
        
    } catch (error) {
        console.error('Error resetting room:', error);
    }
}

function createShuffledDeck() {
    var suits = ['♠', '♥', '♦', '♣'];
    var ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    var deck = [];
    
    for (var s = 0; s < suits.length; s++) {
        for (var r = 0; r < ranks.length; r++) {
            deck.push(ranks[r] + suits[s]);
        }
    }
    
    // Fisher-Yates shuffle
    for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
    
    return deck;
}

// Game State Handlers
function handleGroupStateChange(state) {
    updatePhaseDisplay(state.phase);
    updatePotDisplay(state.pot);
    
    // Community cards
    if (state.communityCards) {
        state.communityCards.forEach(function(card, index) {
            if (DOM.communityCards[index]) {
                DOM.communityCards[index].textContent = card;
                DOM.communityCards[index].className = 'card';
            }
        });
    }
    
    // Dealer cards
    if (state.dealerCards) {
        state.dealerCards.forEach(function(card, index) {
            if (DOM.dealerCards[index]) {
                DOM.dealerCards[index].textContent = card;
                DOM.dealerCards[index].className = 'card';
            }
        });
    }
    
    // Player's own cards
    var playersArray = Object.values(state.players || {});
    var myPlayer = null;
    for (var i = 0; i < playersArray.length; i++) {
        if (playersArray[i].id === (App.currentUser && App.currentUser.uid)) {
            myPlayer = playersArray[i];
            break;
        }
    }
    
    if (myPlayer && myPlayer.cards) {
        myPlayer.cards.forEach(function(card, index) {
            if (DOM.playerCards[index]) {
                DOM.playerCards[index].textContent = card;
                DOM.playerCards[index].className = 'card';
            }
        });
    }
    
    // Betting controls
    var currentPlayerKey = state.currentPlayerSeat ? state.currentPlayerSeat.toString() : '';
    var currentPlayer = state.players ? state.players[currentPlayerKey] : null;
    
    if (currentPlayer && currentPlayer.id === (App.currentUser && App.currentUser.uid) && !currentPlayer.folded) {
        var myBet = currentPlayer.currentBet || 0;
        var maxBet = 0;
        playersArray.forEach(function(p) {
            if ((p.currentBet || 0) > maxBet) maxBet = p.currentBet || 0;
        });
        var canCheck = myBet === maxBet;
        updateBettingControls(canCheck, myBet, state.minRaise);
    } else {
        updateBettingControls(false, 0, 0);
    }
}

function handleGroupActionRequired(state) {
    var currentPlayerKey = state.currentPlayerSeat ? state.currentPlayerSeat.toString() : '';
    var currentPlayer = state.players ? state.players[currentPlayerKey] : null;
    if (currentPlayer) {
        showTurnIndicator(currentPlayer.name);
    }
}

function handleGroupGameEnd(result) {
    hideTurnIndicator();
    
    if (!result) return;
    
    var message = '';
    if (result.winner === 'player') {
        message = 'You won $' + result.amount + '!';
    } else if (result.winner === 'dealer') {
        message = 'Dealer wins.';
    } else if (result.winner === 'split') {
        message = 'Split pot! You get $' + result.amount;
    }
    
    if (message) {
        showMessage(message);
    }
    
    if (result.amount !== undefined && App.currentUser) {
        App.currentUser.balance += result.amount;
        updateBalanceDisplay();
    }
}

// Single Player Mode
function startSinglePlayerGame() {
    App.isMultiplayer = false;
    
    if (DOM.playersList) {
        DOM.playersList.style.display = 'none';
    }
    
    App.game = new PokerGame({
        isMultiplayer: false,
        onStateChange: handleSinglePlayerStateChange,
        onActionRequired: handleSinglePlayerActionRequired,
        onGameEnd: handleSinglePlayerGameEnd,
        onMessage: showMessage
    });
    
    App.game.start();
}

function handleSinglePlayerStateChange(state) {
    updatePhaseDisplay(state.phase);
    updatePotDisplay(state.pot);
    
    if (state.communityCards) {
        state.communityCards.forEach(function(card, index) {
            if (DOM.communityCards[index]) {
                DOM.communityCards[index].textContent = card;
                DOM.communityCards[index].className = 'card';
            }
        });
    }
    
    if (state.playerCards) {
        state.playerCards.forEach(function(card, index) {
            if (DOM.playerCards[index]) {
                DOM.playerCards[index].textContent = card;
                DOM.playerCards[index].className = 'card';
            }
        });
    }
    
    if (state.dealerCards) {
        state.dealerCards.forEach(function(card, index) {
            if (DOM.dealerCards[index]) {
                DOM.dealerCards[index].textContent = card;
                DOM.dealerCards[index].className = 'card';
            }
        });
    }
    
    updateBettingControls(state.canCheck, state.currentBet, state.minRaise);
    
    if (state.playerBalance !== undefined && App.currentUser) {
        App.currentUser.balance = state.playerBalance;
        updateBalanceDisplay();
    }
}

function handleSinglePlayerActionRequired(state) {
    showTurnIndicator(state.currentPlayer || 'You');
    updateBettingControls(state.canCheck, state.currentBet, state.minRaise);
    
    if (state.phase === 'showdown' && state.dealerCards) {
        state.dealerCards.forEach(function(card, index) {
            if (DOM.dealerCards[index]) {
                DOM.dealerCards[index].textContent = card;
                DOM.dealerCards[index].className = 'card';
            }
        });
    }
}

function handleSinglePlayerGameEnd(result) {
    hideTurnIndicator();
    
    var message = '';
    if (result.winner === 'player') {
        message = 'You won $' + result.amount + '! Your hand: ' + result.handDescription;
    } else if (result.winner === 'dealer') {
        message = 'Dealer wins with ' + result.handDescription;
    } else if (result.winner === 'split') {
        message = 'Split pot! You get $' + result.amount;
    } else if (result.winner === 'fold') {
        message = 'You folded. Dealer wins.';
    }
    
    showMessage(message);
    
    if (result.amount !== undefined) {
        updateUserBalance(result.amount);
    }
    
    setTimeout(function() {
        if (App.game && !App.isMultiplayer) {
            App.game.startNewHand();
        }
    }, 3000);
}

async function updateUserBalance(amount) {
    if (!App.currentUser) return;
    
    App.currentUser.balance += amount;
    App.currentUser.gamesPlayed += 1;
    
    if (amount > 0) {
        App.currentUser.totalWinnings += amount;
    }
    
    await saveUserData(App.currentUser.uid, {
        balance: App.currentUser.balance,
        totalWinnings: App.currentUser.totalWinnings,
        gamesPlayed: App.currentUser.gamesPlayed
    });
    
    updateBalanceDisplay();
}

function updatePlayersList(players) {
    if (!DOM.playersList) return;
    
    var html = '<h4>Players Online</h4>';
    var playersArr = Object.values(players || {});
    playersArr.forEach(function(player) {
        var isCurrentPlayer = player.id === (App.currentUser && App.currentUser.uid);
        var status = player.folded ? '(Folded)' : (player.isAllIn ? '(All-In)' : '');
        html += 
            '<div class="player-item ' + (isCurrentPlayer ? 'current' : '') + '">' +
            '<span>' + player.name + ' ' + (isCurrentPlayer ? '(You)' : '') + ' ' + status + '</span>' +
            '<span>$' + (player.balance || 0) + '</span>' +
            '</div>';
    });
    DOM.playersList.innerHTML = html;
}

// UI Functions
function showLoginModal() {
    if (DOM.loginModal) {
        DOM.loginModal.classList.remove('hidden');
        DOM.loginModal.style.display = 'flex';
    }
    if (DOM.gameApp) {
        DOM.gameApp.classList.add('hidden');
        DOM.gameApp.style.display = 'none';
    }
    if (DOM.authError) {
        DOM.authError.textContent = '';
        DOM.authError.style.display = 'none';
    }
    if (DOM.emailInput) DOM.emailInput.value = '';
    if (DOM.passwordInput) DOM.passwordInput.value = '';
}

function showGameInterface() {
    if (DOM.loginModal) {
        DOM.loginModal.classList.add('hidden');
        DOM.loginModal.style.display = 'none';
    }
    if (DOM.gameApp) {
        DOM.gameApp.classList.remove('hidden');
        DOM.gameApp.style.display = 'flex';
    }
    if (DOM.logoutBtn) DOM.logoutBtn.style.display = 'block';
    
    updateBalanceDisplay();
    joinGlobalGroup();
}

function updateBalanceDisplay() {
    if (DOM.balanceDisplay) {
        DOM.balanceDisplay.textContent = 'Balance: $' + (App.currentUser && App.currentUser.balance ? App.currentUser.balance : 0);
    }
}

function showAuthError(message) {
    if (DOM.authError) {
        DOM.authError.textContent = message;
        DOM.authError.style.display = 'block';
    }
    console.warn('Auth error:', message);
}

function showMessage(message) {
    if (DOM.messageCenter) {
        DOM.messageCenter.innerHTML = '<p>' + message + '</p>';
        DOM.messageCenter.style.display = 'block';
        
        setTimeout(function() {
            DOM.messageCenter.style.display = 'none';
        }, 5000);
    }
}

function updatePhaseDisplay(phase) {
    if (DOM.phaseText) {
        var phaseNames = {
            'preflop': 'Pre-Flop',
            'flop': 'Flop',
            'turn': 'Turn',
            'river': 'River',
            'showdown': 'Showdown',
            'waiting': 'Waiting for Players'
        };
        DOM.phaseText.textContent = phaseNames[phase] || phase;
    }
}

function updatePotDisplay(amount) {
    if (DOM.potDisplay) {
        DOM.potDisplay.textContent = 'Pot: $' + (amount || 0);
    }
}

function updateBettingControls(canCheck, currentBet, minRaise) {
    if (DOM.checkBtn) DOM.checkBtn.disabled = !canCheck;
    if (DOM.callBtn) DOM.callBtn.disabled = currentBet === 0;
    if (DOM.raiseBtn) DOM.raiseBtn.disabled = currentBet === 0;
    if (DOM.allInBtn) DOM.allInBtn.disabled = (App.currentUser && App.currentUser.balance ? App.currentUser.balance : 0) <= 0;
    if (DOM.raiseInput) {
        DOM.raiseInput.min = minRaise;
        DOM.raiseInput.placeholder = 'Min: $' + minRaise;
    }
}

function showTurnIndicator(playerName) {
    if (DOM.turnIndicator) {
        DOM.turnIndicator.textContent = playerName + "'s Turn";
        DOM.turnIndicator.style.display = 'block';
    }
}

function hideTurnIndicator() {
    if (DOM.turnIndicator) {
        DOM.turnIndicator.style.display = 'none';
    }
}

function getAuthErrorMessage(errorCode) {
    var messages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password is too weak',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password'
    };
    return messages[errorCode] || 'An error occurred. Please try again.';
}
