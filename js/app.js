/**
 * CasinoSim - Texas Hold'em Application Controller
 * =================================================
 * Handles user interface, authentication, and poker game coordination
 * Fixed: Works without ES6 modules for local file access
 */

// ============================================
// APPLICATION STATE
// ============================================

const AppState = {
    currentUser: null,
    userData: null,
    buyInAmount: 0,
    currentBet: 0,
    gamePhase: 'idle',
    unsubscribeFromUser: null,
    isDemoMode: false
};

// ============================================
// DOM ELEMENTS
// ============================================

const DOM = {
        loginModal: document.getElementById('loginModal'),
    gameApp: document.getElementById('gameApp'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    bankruptcyModal: document.getElementById('bankruptcyModal'),
    rulesModal: document.getElementById('rulesModal'),
    
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    emailLoginBtn: document.getElementById('emailLoginBtn'),
    emailAuthSection: document.getElementById('emailAuthSection'),
    emailInput: document.getElementById('emailInput'),
    passwordInput: document.getElementById('passwordInput'),
    registerBtn: document.getElementById('registerBtn'),
    loginBtn: document.getElementById('loginBtn'),
    sendVerificationBtn: document.getElementById('sendVerificationBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userBalance: document.getElementById('userBalance'),
    playerAvatarSmall: document.getElementById('playerAvatarSmall'),
    
    buyInSection: document.getElementById('buyInSection'),
    bettingControls: document.getElementById('bettingControls'),
    newHandSection: document.getElementById('newHandSection'),
    bettingZone: document.getElementById('bettingZone'),
    
    betSlider: document.getElementById('betSlider'),
    betSliderValue: document.getElementById('betSliderValue'),
    foldBtn: document.getElementById('foldBtn'),
    checkBtn: document.getElementById('checkBtn'),
    callBtn: document.getElementById('callBtn'),
    raiseBtn: document.getElementById('raiseBtn'),
    
    buyInButtons: document.querySelectorAll('.buy-in-btn'),
    customBuyInInput: document.getElementById('customBuyIn'),
    customBuyInBtn: document.getElementById('customBuyInBtn'),
    
    potAmount: document.getElementById('potAmount'),
    toCallAmount: document.getElementById('toCallAmount'),
    phaseText: document.getElementById('phaseText'),
    gameMessage: document.getElementById('gameMessage'),
    playerHandRank: document.getElementById('playerHandRank'),
    dealerStatus: document.getElementById('dealerStatus'),
    handResult: document.getElementById('handResult'),
    
    newHandBtn: document.getElementById('newHandBtn'),
    
    showRulesBtn: document.getElementById('showRulesBtn'),
    closeRulesBtn: document.getElementById('closeRulesBtn'),
    resetBalanceBtn: document.getElementById('resetBalanceBtn')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoading() {
    DOM.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    DOM.loadingOverlay.classList.add('hidden');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function showMessage(message, type = '') {
    DOM.gameMessage.textContent = message;
    DOM.gameMessage.className = 'game-message';
    
    if (type) {
        DOM.gameMessage.classList.add(type);
    }
    
    // Auto-hide message after 1 second
    setTimeout(() => {
        hideMessage();
    }, 1000);
}

function hideMessage() {
    DOM.gameMessage.textContent = '';
}

function updateBalanceDisplay(balance) {
    DOM.userBalance.textContent = formatCurrency(balance);
    
    DOM.userBalance.style.transform = 'scale(1.1)';
    setTimeout(() => {
        DOM.userBalance.style.transform = 'scale(1)';
    }, 200);
}

function updatePotDisplay(amount) {
    DOM.potAmount.textContent = formatCurrency(amount);
}

function updateToCallDisplay(amount) {
    DOM.toCallAmount.textContent = formatCurrency(amount);
}

function updateHandRankDisplay(handRank) {
    if (handRank && handRank.name) {
        DOM.playerHandRank.textContent = handRank.name;
        DOM.handResult.textContent = `Your hand: ${handRank.name}`;
    } else {
        DOM.playerHandRank.textContent = '';
        DOM.handResult.textContent = '';
    }
}

function updatePhaseDisplay(phase) {
    const phaseNames = {
        'preflop': 'Pre-Flop',
        'flop': 'The Flop',
        'turn': 'The Turn',
        'river': 'The River',
        'showdown': 'Showdown'
    };
    DOM.phaseText.textContent = phaseNames[phase] || '';
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLoginSuccess(user) {
    AppState.currentUser = user;
    
    const displayName = user.displayName || user.email || 'Player';
    DOM.userName.textContent = displayName;
    
    if (user.photoURL) {
        DOM.userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%;">`;
        DOM.playerAvatarSmall.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%;">`;
    } else {
        DOM.userAvatar.textContent = displayName.charAt(0).toUpperCase();
        DOM.playerAvatarSmall.textContent = displayName.charAt(0).toUpperCase();
        DOM.playerAvatarSmall.style.background = 'var(--accent-gold)';
        DOM.playerAvatarSmall.style.color = '#1a1a1a';
    }
    
    try {
        showLoading();
        
        if (window.firebaseDb) {
            AppState.userData = await window.firebaseDb.getUserData(user.uid);
            
            AppState.unsubscribeFromUser = window.firebaseDb.subscribeToUserData(user.uid, (data) => {
                AppState.userData = data;
                updateBalanceDisplay(data.balance);
                
                if (data.balance <= 0 && AppState.gamePhase === 'idle') {
                    DOM.bankruptcyModal.classList.remove('hidden');
                }
            });
        } else {
            AppState.isDemoMode = true;
            AppState.userData = {
                balance: 1000,
                displayName: displayName
            };
        }
        
        updateBalanceDisplay(AppState.userData.balance);
        
        DOM.loginModal.classList.add('hidden');
        DOM.gameApp.classList.remove('hidden');
        
        console.log('✅ Login successful:', displayName);
    } catch (error) {
        console.error('❌ Error fetching user data:', error);
        AppState.isDemoMode = true;
        AppState.userData = {
            balance: 1000,
            displayName: displayName
        };
        updateBalanceDisplay(1000);
        
        DOM.loginModal.classList.add('hidden');
        DOM.gameApp.classList.remove('hidden');
    } finally {
        hideLoading();
    }
}

function handleLoginError(error) {
    console.error('❌ Login error:', error);
    hideLoading();
    
    let message = 'Login failed. Please try again.';
    
    if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in popup was closed.';
    } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
    } else if (error.code === 'auth/operation-not-allowed') {
        message = 'This sign-in method is not enabled. Please configure Firebase Authentication.';
    } else if (error.message && error.message.includes('Firebase Auth not initialized')) {
        message = 'Firebase not configured. Playing in Demo Mode.';
        // Auto-switch to demo mode
        handleLoginSuccess({ displayName: 'Demo Player', uid: 'demo-' + Date.now() });
        return;
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
    } else if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please login instead.';
    } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
    } else if (error.message && error.message.includes('verify your email')) {
        message = error.message;
    }
    
    alert(message);
}


async function signInWithGoogle() {
    showLoading();
    try {
        if (window.firebaseAuth && window.firebaseAuth.isFirebaseReady()) {
            console.log('Attempting Google sign-in...');
            const user = await window.firebaseAuth.signInWithGoogle();
            await handleLoginSuccess(user);
        } else {
            console.warn('Firebase not ready, checking again...');
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (window.firebaseAuth && window.firebaseAuth.isFirebaseReady()) {
                const user = await window.firebaseAuth.signInWithGoogle();
                await handleLoginSuccess(user);
            } else {
                throw new Error('Firebase Auth not initialized');
            }
        }
    } catch (error) {
        console.error('Google sign-in failed:', error);
        handleLoginError(error);
    }
}


function toggleEmailAuth() {
    DOM.emailAuthSection.classList.toggle('hidden');
    DOM.googleLoginBtn.classList.toggle('hidden');
}

async function handleEmailAuth(authType) {
    const email = DOM.emailInput.value.trim();
    const password = DOM.passwordInput.value;
    
    if (!email || !password) {
        showMessage('Please enter email and password', 'lose');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'lose');
        return;
    }
    
    showLoading();
    
    try {
        let user;
        
        if (authType === 'register') {
            user = await window.firebaseAuth.registerWithEmail(email, password);
            alert('Account created! Please check your email and click the verification link before logging in.');
            toggleEmailAuth();
            DOM.emailInput.value = '';
            DOM.passwordInput.value = '';
            hideLoading();
            return;
        } else {
            user = await window.firebaseAuth.signInWithEmail(email, password);
        }
        
        await handleLoginSuccess(user);
    } catch (error) {
        handleLoginError(error);
    }
}

async function resendVerificationEmail() {
    try {
        await window.firebaseAuth.resendVerificationEmail();
        alert('Verification email sent! Please check your inbox.');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function logoutUser() {
    try {
        if (window.firebaseAuth && window.firebaseAuth.isFirebaseReady()) {
            await window.firebaseAuth.logoutUser();
        }
        
        if (AppState.unsubscribeFromUser) {
            AppState.unsubscribeFromUser();
        }
        
        AppState.currentUser = null;
        AppState.userData = null;
        AppState.buyInAmount = 0;
        AppState.currentBet = 0;
        AppState.gamePhase = 'idle';
        
        DOM.gameApp.classList.add('hidden');
        DOM.loginModal.classList.remove('hidden');
        
        resetGameBoard();
        
        console.log('👋 User signed out');
    } catch (error) {
        console.error('❌ Sign-out error:', error);
    }
}

// ============================================
// BUY-IN SYSTEM
// ============================================

async function processBuyIn(amount) {
    if (!AppState.userData || AppState.userData.balance < amount) {
        showMessage('Insufficient balance!', 'lose');
        return;
    }
    
    AppState.userData.balance -= amount;
    updateBalanceDisplay(AppState.userData.balance);
    
    if (AppState.currentUser && !AppState.isDemoMode && window.firebaseDb) {
        await window.firebaseDb.updateUserBalance(AppState.currentUser.uid, AppState.userData.balance);
    }
    
    await startHand(amount);
}

function handleBuyInClick(e) {
    const button = e.target.closest('.buy-in-btn');
    if (!button) return;
    
    const amount = parseInt(button.dataset.amount);
    processBuyIn(amount);
}

function handleCustomBuyIn() {
    const input = DOM.customBuyInInput;
    const amount = parseInt(input.value);
    
    if (isNaN(amount) || amount < 10) {
        showMessage('Minimum buy-in is $10', 'lose');
        return;
    }
    
    if (amount > AppState.userData.balance) {
        showMessage('Insufficient balance!', 'lose');
        return;
    }
    
    processBuyIn(amount);
    input.value = '';
}

// ============================================
// GAME ACTIONS
// ============================================

async function startHand(buyIn) {
    const gameState = window.poker.startHand(buyIn);
    
    AppState.buyInAmount = buyIn;
    AppState.gamePhase = 'preflop';
    
    updatePotDisplay(gameState.pot);
    updateToCallDisplay(window.poker.getCallAmount());
    updatePhaseDisplay('preflop');
    updateHandRankDisplay(gameState.playerHandRank);
    
    DOM.buyInSection.classList.add('hidden');
    DOM.bettingControls.classList.remove('hidden');
    DOM.newHandSection.classList.add('hidden');
    DOM.bettingZone.classList.remove('hidden');
    
    window.renderPoker.renderAllCards();
    window.renderPoker.updatePhaseIndicator();
    
    updateBettingControls(gameState);
    
    console.log(`🃏 Hand started with buy-in: $${buyIn}`);
}

function updateBettingControls(gameState) {
    const callAmount = gameState.playerBet < gameState.dealerBet 
        ? gameState.dealerBet - gameState.playerBet 
        : 0;
    
    updateToCallDisplay(callAmount);
    
    const maxBet = Math.min(AppState.userData.balance, callAmount + 1000);
    DOM.betSlider.max = maxBet;
    
    const canCheck = callAmount === 0;
    const canCall = callAmount > 0 && callAmount <= AppState.userData.balance;
    const canRaise = AppState.userData.balance > callAmount;
    
    DOM.checkBtn.disabled = !canCheck;
    DOM.callBtn.disabled = !canCall;
    DOM.raiseBtn.disabled = !canRaise || canCheck;
    DOM.foldBtn.disabled = false;
    
    const sliderValue = parseInt(DOM.betSlider.value);
    DOM.betSliderValue.textContent = formatCurrency(sliderValue);
}

async function playerFold() {
    const gameState = window.poker.playerFold();
    
    DOM.dealerStatus.textContent = '(Player Folded)';
    showMessage('You Folded - Dealer Wins', 'lose');
    
    await handleHandEnd(gameState);
}

async function playerCheck() {
    const gameState = window.poker.playerCheck();
    
    window.renderPoker.renderAllCards();
    updatePotDisplay(gameState.pot);
    updatePhaseDisplay(gameState.currentPhase);
    updateHandRankDisplay(gameState.playerHandRank);
    window.renderPoker.updatePhaseIndicator();
    
    if (gameState.gameOver) {
        await handleHandEnd(gameState);
    } else {
        updateBettingControls(gameState);
    }
}

async function playerCall() {
    const callAmount = window.poker.getCallAmount();
    
    AppState.userData.balance -= callAmount;
    updateBalanceDisplay(AppState.userData.balance);
    
    if (AppState.currentUser && !AppState.isDemoMode && window.firebaseDb) {
        await window.firebaseDb.updateUserBalance(AppState.currentUser.uid, AppState.userData.balance);
    }
    
    const gameState = window.poker.playerCall(callAmount);
    
    window.renderPoker.renderAllCards();
    updatePotDisplay(gameState.pot);
    updatePhaseDisplay(gameState.currentPhase);
    updateHandRankDisplay(gameState.playerHandRank);
    window.renderPoker.updatePhaseIndicator();
    
    if (gameState.gameOver) {
        await handleHandEnd(gameState);
    } else {
        updateBettingControls(gameState);
    }
}

async function playerRaise() {
    const raiseAmount = parseInt(DOM.betSlider.value);
    const totalBet = raiseAmount;
    
    AppState.userData.balance -= (totalBet - AppState.currentBet);
    updateBalanceDisplay(AppState.userData.balance);
    AppState.currentBet = totalBet;
    
    if (AppState.currentUser && !AppState.isDemoMode && window.firebaseDb) {
        await window.firebaseDb.updateUserBalance(AppState.currentUser.uid, AppState.userData.balance);
    }
    
    const gameState = window.poker.playerRaise(raiseAmount);
    
    window.renderPoker.renderAllCards();
    updatePotDisplay(gameState.pot);
    updatePhaseDisplay(gameState.currentPhase);
    updateHandRankDisplay(gameState.playerHandRank);
    window.renderPoker.updatePhaseIndicator();
    
    if (gameState.gameOver) {
        await handleHandEnd(gameState);
    } else {
        updateBettingControls(gameState);
    }
}

async function handleHandEnd(gameState) {
    AppState.gamePhase = 'showdown';
    AppState.currentBet = 0;
    
    window.renderPoker.revealDealerCards();
    
    if (gameState.dealerHandRank) {
        DOM.dealerStatus.textContent = gameState.dealerHandRank.name;
    }
    
    let winnings = 0;
    let message = '';
    let messageType = '';
    
    if (gameState.winner === 'player') {
        winnings = gameState.pot;
        message = `You Win ${formatCurrency(winnings)}!`;
        messageType = 'win';
        
        if (gameState.playerHandRank) {
            message += ` (${gameState.playerHandRank.name})`;
        }
    } else if (gameState.winner === 'dealer') {
        winnings = 0;
        message = 'Dealer Wins';
        messageType = 'lose';
    } else {
        winnings = gameState.pot / 2;
        message = `Split Pot - ${formatCurrency(winnings)} Each`;
        messageType = 'push';
    }
    
    showMessage(message, messageType);
    
    AppState.userData.balance += winnings;
    updateBalanceDisplay(AppState.userData.balance);
    
    if (AppState.currentUser && !AppState.isDemoMode && window.firebaseDb) {
        await window.firebaseDb.updateUserBalance(AppState.currentUser.uid, AppState.userData.balance);
        
        const stats = {
            gamesPlayed: (AppState.userData.gamesPlayed || 0) + 1,
            totalWins: (AppState.userData.totalWins || 0) + (gameState.winner === 'player' ? 1 : 0),
            totalLosses: (AppState.userData.totalLosses || 0) + (gameState.winner === 'dealer' ? 1 : 0),
            totalPushes: (AppState.userData.totalPushes || 0) + (gameState.winner === 'tie' ? 1 : 0)
        };
        await window.firebaseDb.updateUserStats(AppState.currentUser.uid, stats);
    }
    
    DOM.bettingControls.classList.add('hidden');
    DOM.newHandSection.classList.remove('hidden');
    
    if (AppState.userData.balance <= 0) {
        setTimeout(() => {
            DOM.bankruptcyModal.classList.remove('hidden');
        }, 1500);
    }
}

function startNewHand() {
    AppState.gamePhase = 'idle';
    AppState.currentBet = 0;
    
    DOM.bettingControls.classList.add('hidden');
    DOM.newHandSection.classList.add('hidden');
    DOM.bettingZone.classList.add('hidden');
    DOM.buyInSection.classList.remove('hidden');
    
    hideMessage();
    DOM.dealerStatus.textContent = '';
    DOM.handResult.textContent = '';
    updateHandRankDisplay(null);
    updatePotDisplay(0);
    
    resetGameBoard();
    updateBuyInButtons();
}

function updateBuyInButtons() {
    DOM.buyInButtons.forEach(btn => {
        const amount = parseInt(btn.dataset.amount);
        btn.disabled = amount > AppState.userData.balance;
    });
}

function resetGameBoard() {
    window.poker.resetGame();
    
    const cardSlots = [
        'playerCard1', 'playerCard2',
        'dealerCard1', 'dealerCard2',
        'boardCard1', 'boardCard2', 'boardCard3', 'boardCard4', 'boardCard5'
    ];
    
    cardSlots.forEach(slotId => {
        const slot = document.getElementById(slotId);
        if (slot) {
            slot.innerHTML = '';
            if (slotId.startsWith('board')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'card-placeholder';
                slot.appendChild(placeholder);
            } else {
                const cardBack = document.createElement('div');
                cardBack.className = 'card-back';
                slot.appendChild(cardBack);
            }
        }
    });
    
    DOM.phaseText.textContent = '';
}

async function resetBalance() {
    if (window.firebaseDb) {
        const newBalance = await window.firebaseDb.resetUserBalance(AppState.currentUser.uid);
        AppState.userData.balance = newBalance;
        updateBalanceDisplay(newBalance);
    } else {
        AppState.userData.balance = 1000;
        updateBalanceDisplay(1000);
    }
    
    DOM.bankruptcyModal.classList.add('hidden');
    showMessage('Balance reset! Good luck!', 'win');
    
    updateBuyInButtons();
}

function handleBetSliderChange() {
    const value = parseInt(DOM.betSlider.value);
    DOM.betSliderValue.textContent = formatCurrency(value);
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
    DOM.googleLoginBtn.addEventListener('click', signInWithGoogle);
    DOM.emailLoginBtn.addEventListener('click', toggleEmailAuth);
    DOM.registerBtn.addEventListener('click', () => handleEmailAuth('register'));
    DOM.loginBtn.addEventListener('click', () => handleEmailAuth('login'));
    DOM.sendVerificationBtn.addEventListener('click', resendVerificationEmail);
    DOM.logoutBtn.addEventListener('click', logoutUser);
    
    // ... keep all other event listeners the same ...
}

    DOM.buyInButtons.forEach(btn => {
        btn.addEventListener('click', handleBuyInClick);
    });
    
    DOM.customBuyInBtn.addEventListener('click', handleCustomBuyIn);
    DOM.customBuyInInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCustomBuyIn();
        }
    });
    
    DOM.foldBtn.addEventListener('click', playerFold);
    DOM.checkBtn.addEventListener('click', playerCheck);
    DOM.callBtn.addEventListener('click', playerCall);
    DOM.raiseBtn.addEventListener('click', playerRaise);
    
    DOM.betSlider.addEventListener('input', handleBetSliderChange);
    
    DOM.newHandBtn.addEventListener('click', startNewHand);
    
    DOM.resetBalanceBtn.addEventListener('click', resetBalance);
    
    DOM.showRulesBtn.addEventListener('click', () => {
        DOM.rulesModal.classList.remove('hidden');
    });
    DOM.closeRulesBtn.addEventListener('click', () => {
        DOM.rulesModal.classList.add('hidden');
    });
    
    DOM.rulesModal.addEventListener('click', (e) => {
        if (e.target === DOM.rulesModal) {
            DOM.rulesModal.classList.add('hidden');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (AppState.gamePhase === 'idle') return;
        
        switch (e.key.toLowerCase()) {
            case 'f':
                if (!DOM.foldBtn.disabled) playerFold();
                break;
            case 'c':
            case ' ':
                if (!DOM.checkBtn.disabled) playerCheck();
                else if (!DOM.callBtn.disabled) playerCall();
                break;
            case 'r':
                if (!DOM.raiseBtn.disabled) playerRaise();
                break;
        
    );
}

async function checkAuthState() {
    try {
        if (window.firebaseAuth && window.firebaseAuth.isFirebaseReady()) {
            window.firebaseAuth.onAuthChange(async (user) => {
                if (user) {
                    await handleLoginSuccess(user);
                } else {
                    hideLoading();
                    DOM.loginModal.classList.remove('hidden');
                }
            });
        } else {
            console.log('🎮 Running in demo mode (Firebase not configured)');
            AppState.isDemoMode = true;
            hideLoading();
            DOM.loginModal.classList.remove('hidden');
        }
    } catch (error) {
        console.log('🎮 Running in demo mode (no Firebase)');
        AppState.isDemoMode = true;
        hideLoading();
        DOM.loginModal.classList.remove('hidden');
    }
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    console.log('🎰 CasinoSim Texas Hold\'em initializing...');
    
    initEventListeners();
    
    // Wait a moment for Firebase scripts to load
    setTimeout(async () => {
        await checkAuthState();
        console.log('✅ CasinoSim ready!');
    }, 500);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.CasinoSim = {
    state: AppState,
    dom: DOM,
    refreshBalance: async () => {
        if (AppState.currentUser && window.firebaseDb) {
            AppState.userData = await window.firebaseDb.getUserData(AppState.currentUser.uid);
            updateBalanceDisplay(AppState.userData.balance);
        }
    }
};
