/**
 * CasinoSim - Texas Hold'em Application Controller
 * =================================================
 * Handles user interface, authentication, and poker game coordination
 */

// ============================================
// APPLICATION STATE
// ============================================

const AppState = {
    currentUser: null,
    userData: null,
    buyInAmount: 0,
    currentBet: 0,
    gamePhase: 'idle', // idle, preflop, flop, turn, river, showdown
    unsubscribeFromUser: null,
    isDemoMode: false
};

// ============================================
// DOM ELEMENTS
// ============================================

const DOM = {
    // Modals
    loginModal: document.getElementById('loginModal'),
    gameApp: document.getElementById('gameApp'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    bankruptcyModal: document.getElementById('bankruptcyModal'),
    rulesModal: document.getElementById('rulesModal'),
    
    // Auth buttons
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    anonymousLoginBtn: document.getElementById('anonymousLoginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // User info
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userBalance: document.getElementById('userBalance'),
    playerAvatarSmall: document.getElementById('playerAvatarSmall'),
    
    // Game sections
    buyInSection: document.getElementById('buyInSection'),
    bettingControls: document.getElementById('bettingControls'),
    newHandSection: document.getElementById('newHandSection'),
    bettingZone: document.getElementById('bettingZone'),
    
    // Betting controls
    betSlider: document.getElementById('betSlider'),
    betSliderValue: document.getElementById('betSliderValue'),
    foldBtn: document.getElementById('foldBtn'),
    checkBtn: document.getElementById('checkBtn'),
    callBtn: document.getElementById('callBtn'),
    raiseBtn: document.getElementById('raiseBtn'),
    
    // Buy-in buttons
    buyInButtons: document.querySelectorAll('.buy-in-btn'),
    customBuyInInput: document.getElementById('customBuyIn'),
    customBuyInBtn: document.getElementById('customBuyInBtn'),
    
    // Game display
    potAmount: document.getElementById('potAmount'),
    toCallAmount: document.getElementById('toCallAmount'),
    phaseText: document.getElementById('phaseText'),
    gameMessage: document.getElementById('gameMessage'),
    playerHandRank: document.getElementById('playerHandRank'),
    dealerStatus: document.getElementById('dealerStatus'),
    handResult: document.getElementById('handResult'),
    
    // New hand button
    newHandBtn: document.getElementById('newHandBtn'),
    
    // Other
    showRulesBtn: document.getElementById('showRulesBtn'),
    closeRulesBtn: document.getElementById('closeRulesBtn'),
    resetBalanceBtn: document.getElementById('resetBalanceBtn')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show loading overlay
 */
const showLoading = () => {
    DOM.loadingOverlay.classList.remove('hidden');
};

/**
 * Hide loading overlay
 */
const hideLoading = () => {
    DOM.loadingOverlay.classList.add('hidden');
};

/**
 * Format currency
 * @param {number} amount 
 * @returns {string} Formatted amount
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Display game message
 * @param {string} message - Message to display
 * @param {string} type - Message type (win, lose, push)
 */
const showMessage = (message, type = '') => {
    DOM.gameMessage.textContent = message;
    DOM.gameMessage.className = 'game-message';
    
    if (type) {
        DOM.gameMessage.classList.add(type);
    }
};

/**
 * Hide game message
 */
const hideMessage = () => {
    DOM.gameMessage.textContent = '';
};

/**
 * Update balance display
 * @param {number} balance 
 */
const updateBalanceDisplay = (balance) => {
    DOM.userBalance.textContent = formatCurrency(balance);
    
    // Animate balance change
    DOM.userBalance.style.transform = 'scale(1.1)';
    setTimeout(() => {
        DOM.userBalance.style.transform = 'scale(1)';
    }, 200);
};

/**
 * Update pot display
 * @param {number} amount 
 */
const updatePotDisplay = (amount) => {
    DOM.potAmount.textContent = formatCurrency(amount);
};

/**
 * Update "to call" amount
 * @param {number} amount 
 */
const updateToCallDisplay = (amount) => {
    DOM.toCallAmount.textContent = formatCurrency(amount);
};

/**
 * Update player hand rank display
 * @param {Object|null} handRank 
 */
const updateHandRankDisplay = (handRank) => {
    if (handRank && handRank.name) {
        DOM.playerHandRank.textContent = handRank.name;
        DOM.handResult.textContent = `Your hand: ${handRank.name}`;
    } else {
        DOM.playerHandRank.textContent = '';
        DOM.handResult.textContent = '';
    }
};

/**
 * Update phase display
 * @param {string} phase 
 */
const updatePhaseDisplay = (phase) => {
    const phaseNames = {
        'preflop': 'Pre-Flop',
        'flop': 'The Flop',
        'turn': 'The Turn',
        'river': 'The River',
        'showdown': 'Showdown'
    };
    DOM.phaseText.textContent = phaseNames[phase] || '';
};

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Handle successful login
 * @param {Object} user - Firebase user object
 */
const handleLoginSuccess = async (user) => {
    AppState.currentUser = user;
    
    // Update UI with user info
    const displayName = user.displayName || user.email || 'Player';
    DOM.userName.textContent = displayName;
    
    // Set avatar
    if (user.photoURL) {
        DOM.userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%;">`;
        DOM.playerAvatarSmall.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%;">`;
    } else {
        DOM.userAvatar.textContent = displayName.charAt(0).toUpperCase();
        DOM.playerAvatarSmall.textContent = displayName.charAt(0).toUpperCase();
        DOM.playerAvatarSmall.style.background = 'var(--accent-gold)';
        DOM.playerAvatarSmall.style.color = '#1a1a1a';
    }
    
    // Get user data from Firestore
    try {
        showLoading();
        const { getUserData, subscribeToUserData } = await import('./firebase-config.js');
        AppState.userData = await getUserData(user.uid);
        
        // Subscribe to real-time updates
        AppState.unsubscribeFromUser = subscribeToUserData(user.uid, (data) => {
            AppState.userData = data;
            updateBalanceDisplay(data.balance);
            
            // Check for bankruptcy
            if (data.balance <= 0 && AppState.gamePhase === 'idle') {
                DOM.bankruptcyModal.classList.remove('hidden');
            }
        });
        
        updateBalanceDisplay(AppState.userData.balance);
        
        // Hide login modal, show game
        DOM.loginModal.classList.add('hidden');
        DOM.gameApp.classList.remove('hidden');
        
        console.log('✅ Login successful:', displayName);
    } catch (error) {
        console.error('❌ Error fetching user data:', error);
        // Still show the game in demo mode
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
};

/**
 * Handle login error
 * @param {Error} error 
 */
const handleLoginError = (error) => {
    console.error('❌ Login error:', error);
    hideLoading();
    
    let message = 'Login failed. Please try again.';
    
    if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in popup was closed.';
    } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
    } else if (error.code === 'auth/operation-not-allowed') {
        message = 'This sign-in method is not enabled.';
    }
    
    alert(message);
};

/**
 * Attempt Google sign-in
 */
const signInWithGoogle = async () => {
    showLoading();
    try {
        const { signInWithGoogle } = await import('./firebase-config.js');
        const user = await signInWithGoogle();
        await handleLoginSuccess(user);
    } catch (error) {
        handleLoginError(error);
    }
};

/**
 * Attempt anonymous sign-in
 */
const signInAsGuest = async () => {
    showLoading();
    try {
        const { signInAsGuest } = await import('./firebase-config.js');
        const user = await signInAsGuest();
        await handleLoginSuccess(user);
    } catch (error) {
        handleLoginError(error);
    }
};

/**
 * Sign out user
 */
const logoutUser = async () => {
    try {
        const { logoutUser } = await import('./firebase-config.js');
        await logoutUser();
        
        // Cleanup
        if (AppState.unsubscribeFromUser) {
            AppState.unsubscribeFromUser();
        }
        
        // Reset state
        AppState.currentUser = null;
        AppState.userData = null;
        AppState.buyInAmount = 0;
        AppState.currentBet = 0;
        AppState.gamePhase = 'idle';
        
        // Show login modal
        DOM.gameApp.classList.add('hidden');
        DOM.loginModal.classList.remove('hidden');
        
        // Reset game board
        resetGameBoard();
        
        console.log('👋 User signed out');
    } catch (error) {
        console.error('❌ Sign-out error:', error);
    }
};

// ============================================
// BUY-IN SYSTEM
// ============================================

/**
 * Process buy-in
 * @param {number} amount - Buy-in amount
 */
const processBuyIn = async (amount) => {
    if (!AppState.userData || AppState.userData.balance < amount) {
        showMessage('Insufficient balance!', 'lose');
        return;
    }
    
    // Deduct buy-in from balance
    AppState.userData.balance -= amount;
    updateBalanceDisplay(AppState.userData.balance);
    
    // Save balance update
    if (AppState.currentUser && !AppState.isDemoMode) {
        const { updateUserBalance } = await import('./firebase-config.js');
        await updateUserBalance(AppState.currentUser.uid, AppState.userData.balance);
    }
    
    // Start the hand
    await startHand(amount);
};

/**
 * Handle buy-in button click
 * @param {Event} e 
 */
const handleBuyInClick = (e) => {
    const button = e.target.closest('.buy-in-btn');
    if (!button) return;
    
    const amount = parseInt(button.dataset.amount);
    processBuyIn(amount);
};

/**
 * Handle custom buy-in
 */
const handleCustomBuyIn = () => {
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
};

// ============================================
// GAME ACTIONS
// ============================================

/**
 * Start a new poker hand
 * @param {number} buyIn - Buy-in amount
 */
const startHand = async (buyIn) => {
    // Import poker game
    const { poker, renderPoker } = await import('./game.js');
    
    // Start the hand
    const gameState = poker.startHand(buyIn);
    
    AppState.buyInAmount = buyIn;
    AppState.gamePhase = 'preflop';
    
    // Update UI
    updatePotDisplay(gameState.pot);
    updateToCallDisplay(poker.getCallAmount());
    updatePhaseDisplay('preflop');
    updateHandRankDisplay(gameState.playerHandRank);
    
    // Switch to betting controls
    DOM.buyInSection.classList.add('hidden');
    DOM.bettingControls.classList.remove('hidden');
    DOM.newHandSection.classList.add('hidden');
    DOM.bettingZone.classList.remove('hidden');
    
    // Render cards
    renderPoker.renderAllCards();
    renderPoker.updatePhaseIndicator();
    
    // Update betting controls
    updateBettingControls(gameState);
    
    console.log(`🃏 Hand started with buy-in: $${buyIn}`);
};

/**
 * Update betting controls based on game state
 * @param {Object} gameState 
 */
const updateBettingControls = (gameState) => {
    const callAmount = gameState.playerBet < gameState.dealerBet 
        ? gameState.dealerBet - gameState.playerBet 
        : 0;
    
    updateToCallDisplay(callAmount);
    
    // Update slider max
    const maxBet = Math.min(AppState.userData.balance, callAmount + 1000);
    DOM.betSlider.max = maxBet;
    
    // Enable/disable buttons
    const canCheck = callAmount === 0;
    const canCall = callAmount > 0 && callAmount <= AppState.userData.balance;
    const canRaise = AppState.userData.balance > callAmount;
    
    DOM.checkBtn.disabled = !canCheck;
    DOM.callBtn.disabled = !canCall;
    DOM.raiseBtn.disabled = !canRaise || canCheck;
    DOM.foldBtn.disabled = false;
    
    // Update slider value display
    const sliderValue = parseInt(DOM.betSlider.value);
    DOM.betSliderValue.textContent = formatCurrency(sliderValue);
};

/**
 * Player folds
 */
const playerFold = async () => {
    const { poker, renderPoker } = await import('./game.js');
    
    const gameState = poker.playerFold();
    
    // Update dealer status
    DOM.dealerStatus.textContent = '(Player Folded)';
    
    // Show result
    showMessage('You Folded - Dealer Wins', 'lose');
    
    // Handle end of hand
    await handleHandEnd(gameState);
};

/**
 * Player checks
 */
const playerCheck = async () => {
    const { poker, renderPoker } = await import('./game.js');
    
    const gameState = poker.playerCheck();
    
    // Update UI
    renderPoker.renderAllCards();
    updatePotDisplay(gameState.pot);
    updatePhaseDisplay(gameState.currentPhase);
    updateHandRankDisplay(gameState.playerHandRank);
    renderPoker.updatePhaseIndicator();
    
    // Check if hand is over
    if (gameState.gameOver) {
        await handleHandEnd(gameState);
    } else {
        // Update betting controls for next round
        updateBettingControls(gameState);
    }
};

/**
 * Player calls
 */
const playerCall = async () => {
    const { poker, renderPoker } = await import('./game.js');
    
    const callAmount = poker.getCallAmount();
    
    // Deduct from balance
    AppState.userData.balance -= callAmount;
    updateBalanceDisplay(AppState.userData.balance);
    
    // Save to Firebase
    if (AppState.currentUser && !AppState.isDemoMode) {
        const { updateUserBalance } = await import('./firebase-config.js');
        await updateUserBalance(AppState.currentUser.uid, AppState.userData.balance);
    }
    
    const gameState = poker.playerCall(callAmount);
    
    // Update UI
    renderPoker.renderAllCards();
    updatePotDisplay(gameState.pot);
    updatePhaseDisplay(gameState.currentPhase);
    updateHandRankDisplay(gameState.playerHandRank);
    renderPoker.updatePhaseIndicator();
    
    // Check if hand is over
    if (gameState.gameOver) {
        await handleHandEnd(gameState);
    } else {
        // Update betting controls for next round
        updateBettingControls(gameState);
    }
};

/**
 * Player raises
 */
const playerRaise = async () => {
    const { poker, renderPoker } = await import('./game.js');
    
    const raiseAmount = parseInt(DOM.betSlider.value);
    const totalBet = raiseAmount;
    
    // Deduct from balance
    AppState.userData.balance -= (totalBet - AppState.currentBet);
    updateBalanceDisplay(AppState.userData.balance);
    AppState.currentBet = totalBet;
    
    // Save to Firebase
    if (AppState.currentUser && !AppState.isDemoMode) {
        const { updateUserBalance } = await import('./firebase-config.js');
        await updateUserBalance(AppState.currentUser.uid, AppState.userData.balance);
    }
    
    const gameState = poker.playerRaise(raiseAmount);
    
    // Update UI
    renderPoker.renderAllCards();
    updatePotDisplay(gameState.pot);
    updatePhaseDisplay(gameState.currentPhase);
    updateHandRankDisplay(gameState.playerHandRank);
    renderPoker.updatePhaseIndicator();
    
    // Check if hand is over
    if (gameState.gameOver) {
        await handleHandEnd(gameState);
    } else {
        // Update betting controls for next round
        updateBettingControls(gameState);
    }
};

/**
 * Handle end of hand
 * @param {Object} gameState 
 */
const handleHandEnd = async (gameState) => {
    AppState.gamePhase = 'showdown';
    AppState.currentBet = 0;
    
    // Reveal dealer cards
    const { renderPoker } = await import('./game.js');
    renderPoker.revealDealerCards();
    
    // Update dealer hand rank display
    if (gameState.dealerHandRank) {
        DOM.dealerStatus.textContent = gameState.dealerHandRank.name;
    }
    
    // Calculate winnings
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
        winnings = gameState.pot / 2; // Split pot
        message = `Split Pot - ${formatCurrency(winnings)} Each`;
        messageType = 'push';
    }
    
    // Show message
    showMessage(message, messageType);
    
    // Update balance
    AppState.userData.balance += winnings;
    updateBalanceDisplay(AppState.userData.balance);
    
    // Save to Firebase
    if (AppState.currentUser && !AppState.isDemoMode) {
        const { updateUserBalance, updateUserStats } = await import('./firebase-config.js');
        await updateUserBalance(AppState.currentUser.uid, AppState.userData.balance);
        
        // Update stats
        const stats = {
            gamesPlayed: (AppState.userData.gamesPlayed || 0) + 1,
            totalWins: (AppState.userData.totalWins || 0) + (gameState.winner === 'player' ? 1 : 0),
            totalLosses: (AppState.userData.totalLosses || 0) + (gameState.winner === 'dealer' ? 1 : 0),
            totalPushes: (AppState.userData.totalPushes || 0) + (gameState.winner === 'tie' ? 1 : 0)
        };
        await updateUserStats(AppState.currentUser.uid, stats);
    }
    
    // Show new hand button
    DOM.bettingControls.classList.add('hidden');
    DOM.newHandSection.classList.remove('hidden');
    
    // Check for bankruptcy
    if (AppState.userData.balance <= 0) {
        setTimeout(() => {
            DOM.bankruptcyModal.classList.remove('hidden');
        }, 1500);
    }
};

/**
 * Reset for new hand
 */
const startNewHand = () => {
    AppState.gamePhase = 'idle';
    AppState.currentBet = 0;
    
    // Hide betting controls, show buy-in
    DOM.bettingControls.classList.add('hidden');
    DOM.newHandSection.classList.add('hidden');
    DOM.bettingZone.classList.add('hidden');
    DOM.buyInSection.classList.remove('hidden');
    
    // Reset UI
    hideMessage();
    DOM.dealerStatus.textContent = '';
    DOM.handResult.textContent = '';
    updateHandRankDisplay(null);
    updatePotDisplay(0);
    
    // Reset game board
    resetGameBoard();
    
    // Update buy-in buttons based on balance
    updateBuyInButtons();
};

/**
 * Update buy-in buttons based on balance
 */
const updateBuyInButtons = () => {
    DOM.buyInButtons.forEach(btn => {
        const amount = parseInt(btn.dataset.amount);
        btn.disabled = amount > AppState.userData.balance;
    });
};

/**
 * Reset game board
 */
const resetGameBoard = async () => {
    const { poker, renderPoker } = await import('./game.js');
    poker.resetGame();
    
    // Clear all card slots
    const cardSlots = [
        'playerCard1', 'playerCard2',
        'dealerCard1', 'dealerCard2',
        'boardCard1', 'boardCard2', 'boardCard3', 'boardCard4', 'boardCard5'
    ];
    
    cardSlots.forEach(slotId => {
        const slot = document.getElementById(slotId);
        if (slot) {
            slot.innerHTML = '';
            // Add placeholder for community cards
            if (slotId.startsWith('board')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'card-placeholder';
                slot.appendChild(placeholder);
            } else {
                // Add card back for hole cards
                const cardBack = document.createElement('div');
                cardBack.className = 'card-back';
                slot.appendChild(cardBack);
            }
        }
    });
    
    DOM.phaseText.textContent = '';
};

/**
 * Reset balance (bankruptcy recovery)
 */
const resetBalance = async () => {
    const { resetUserBalance } = await import('./firebase-config.js');
    
    const newBalance = await resetUserBalance(AppState.currentUser.uid);
    
    AppState.userData.balance = newBalance;
    updateBalanceDisplay(newBalance);
    
    DOM.bankruptcyModal.classList.add('hidden');
    showMessage('Balance reset! Good luck!', 'win');
    
    // Update buy-in buttons
    updateBuyInButtons();
};

/**
 * Handle bet slider change
 */
const handleBetSliderChange = () => {
    const value = parseInt(DOM.betSlider.value);
    DOM.betSliderValue.textContent = formatCurrency(value);
};

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Initialize all event listeners
 */
const initEventListeners = () => {
    // Auth buttons
    DOM.googleLoginBtn.addEventListener('click', signInWithGoogle);
    DOM.anonymousLoginBtn.addEventListener('click', signInAsGuest);
    DOM.logoutBtn.addEventListener('click', logoutUser);
    
    // Buy-in buttons
    DOM.buyInButtons.forEach(btn => {
        btn.addEventListener('click', handleBuyInClick);
    });
    
    // Custom buy-in
    DOM.customBuyInBtn.addEventListener('click', handleCustomBuyIn);
    DOM.customBuyInInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCustomBuyIn();
        }
    });
    
    // Betting controls
    DOM.foldBtn.addEventListener('click', playerFold);
    DOM.checkBtn.addEventListener('click', playerCheck);
    DOM.callBtn.addEventListener('click', playerCall);
    DOM.raiseBtn.addEventListener('click', playerRaise);
    
    // Bet slider
    DOM.betSlider.addEventListener('input', handleBetSliderChange);
    
    // New hand button
    DOM.newHandBtn.addEventListener('click', startNewHand);
    
    // Bankruptcy
    DOM.resetBalanceBtn.addEventListener('click', resetBalance);
    
    // Rules modal
    DOM.showRulesBtn.addEventListener('click', () => {
        DOM.rulesModal.classList.remove('hidden');
    });
    DOM.closeRulesBtn.addEventListener('click', () => {
        DOM.rulesModal.classList.add('hidden');
    });
    
    // Close modal on backdrop click
    DOM.rulesModal.addEventListener('click', (e) => {
        if (e.target === DOM.rulesModal) {
            DOM.rulesModal.classList.add('hidden');
        }
    });
    
    // Keyboard shortcuts
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
        }
    });
};

/**
 * Check initial auth state
 */
const checkAuthState = async () => {
    try {
        const { onAuthChange } = await import('./firebase-config.js');
        
        onAuthChange(async (user) => {
            if (user) {
                await handleLoginSuccess(user);
            } else {
                hideLoading();
                DOM.loginModal.classList.remove('hidden');
            }
        });
    } catch (error) {
        console.log('🎮 Running in demo mode (no Firebase)');
        AppState.isDemoMode = true;
        hideLoading();
        DOM.loginModal.classList.remove('hidden');
    }
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application
 */
const init = async () => {
    console.log('🎰 CasinoSim Texas Hold\'em initializing...');
    
    initEventListeners();
    await checkAuthState();
    
    console.log('✅ CasinoSim ready!');
};

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
        if (AppState.currentUser) {
            const { getUserData } = await import('./firebase-config.js');
            AppState.userData = await getUserData(AppState.currentUser.uid);
            updateBalanceDisplay(AppState.userData.balance);
        }
    }
};
