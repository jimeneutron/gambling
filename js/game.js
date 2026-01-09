/**
 * CasinoSim - Texas Hold'em Poker Game Logic
 * ============================================
 * Complete poker engine with hand evaluation, betting rounds, and showdown
 */

// ============================================
// CARD DEFINITIONS
// ============================================

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const SUIT_NAMES = {
    '♠': 'spades',
    '♥': 'hearts',
    '♦': 'diamonds',
    '♣': 'clubs'
};

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const RANK_DISPLAY = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
    '8': '8', '9': '9', '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
};

const SUIT_COLORS = {
    '♠': 'black',
    '♣': 'black',
    '♥': 'red',
    '♦': 'red'
};

// ============================================
// HAND RANKINGS
// ============================================

const HAND_RANKINGS = {
    ROYAL_FLUSH: 10,
    STRAIGHT_FLUSH: 9,
    FOUR_OF_A_KIND: 8,
    FULL_HOUSE: 7,
    FLUSH: 6,
    STRAIGHT: 5,
    THREE_OF_A_KIND: 4,
    TWO_PAIR: 3,
    ONE_PAIR: 2,
    HIGH_CARD: 1
};

const HAND_NAMES = {
    10: 'Royal Flush',
    9: 'Straight Flush',
    8: 'Four of a Kind',
    7: 'Full House',
    6: 'Flush',
    5: 'Straight',
    4: 'Three of a Kind',
    3: 'Two Pair',
    2: 'One Pair',
    1: 'High Card'
};

// ============================================
// GAME STATE
// ============================================

let gameState = {
    deck: [],
    playerHoleCards: [],
    dealerHoleCards: [],
    communityCards: [],
    pot: 0,
    playerBet: 0,
    dealerBet: 0,
    currentPhase: 'idle', // idle, preflop, flop, turn, river, showdown
    gameOver: false,
    winner: null,
    playerHandRank: null,
    dealerHandRank: null,
    playerFolded: false
};

// ============================================
// DECK MANAGEMENT
// ============================================

/**
 * Create a new deck of cards
 * @returns {Array} Array of card objects
 */
const createDeck = () => {
    const deck = [];
    
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                suit,
                rank,
                value: RANK_VALUES[rank],
                suitName: SUIT_NAMES[suit],
                color: SUIT_COLORS[suit]
            });
        }
    }
    
    return deck;
};

/**
 * Shuffle deck using Fisher-Yates algorithm
 * @param {Array} deck - Array to shuffle
 * @returns {Array} Shuffled array
 */
const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
};

/**
 * Create and shuffle a new deck
 * @returns {Array} Shuffled deck
 */
const getNewShuffledDeck = () => {
    const deck = createDeck();
    return shuffleDeck(deck);
};

/**
 * Draw a card from the deck
 * @returns {Object} Card object
 */
const drawCard = () => {
    if (gameState.deck.length === 0) {
        gameState.deck = getNewShuffledDeck();
    }
    return gameState.deck.pop();
};

// ============================================
// HAND EVALUATION
// ============================================

/**
 * Get numeric values from cards
 * @param {Array} cards - Array of card objects
 * @returns {Array} Sorted numeric values
 */
const getCardValues = (cards) => {
    return cards.map(c => c.value).sort((a, b) => a - b);
};

/**
 * Check if all cards have the same suit
 * @param {Array} cards - Array of card objects
 * @returns {boolean}
 */
const isFlush = (cards) => {
    if (cards.length < 5) return false;
    const firstSuit = cards[0].suit;
    return cards.every(card => card.suit === firstSuit);
};

/**
 * Check for sequential values (handles A-2-3-4-5 wheel)
 * @param {Array} cards - Array of card objects
 * @returns {boolean}
 */
const isStraight = (cards) => {
    if (cards.length < 5) return false;
    
    const values = getCardValues(cards);
    const uniqueValues = [...new Set(values)];
    
    // Check for A-2-3-4-5 wheel (A counts as 1)
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && 
        uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return true;
    }
    
    // Check normal straight
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
            return true;
        }
    }
    
    return false;
};

/**
 * Get the lowest value in a straight (for A-2-3-4-5)
 * @param {Array} cards - Array of card objects
 * @returns {number} Lowest value or null
 */
const getStraightLowValue = (cards) => {
    const values = getCardValues(cards);
    const uniqueValues = [...new Set(values)];
    
    // Check for A-2-3-4-5 wheel
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && 
        uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return 1; // A counts as 1
    }
    
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
            return uniqueValues[i];
        }
    }
    
    return null;
};

/**
 * Count occurrences of each rank
 * @param {Array} cards - Array of card objects
 * @returns {Object} Map of rank to count
 */
const countRanks = (cards) => {
    const counts = {};
    for (const card of cards) {
        counts[card.value] = (counts[card.value] || 0) + 1;
    }
    return counts;
};

/**
 * Get grouped counts (for pairs, trips, quads)
 * @param {Array} cards - Array of card objects
 * @returns {Array} Array of [count, value] pairs sorted by count desc, then value desc
 */
const getRankGroups = (cards) => {
    const counts = countRanks(cards);
    return Object.entries(counts)
        .map(([value, count]) => [parseInt(count), parseInt(value)])
        .sort((a, b) => {
            if (a[0] !== b[0]) return b[0] - a[0]; // Higher count first
            return b[1] - a[1]; // Higher value first
        });
};

/**
 * Evaluate a 5+ card poker hand
 * @param {Array} cards - Array of 5+ card objects
 * @returns {Object} Hand evaluation result
 */
const evaluateHand = (cards) => {
    if (cards.length < 5) {
        return { rank: HAND_RANKINGS.HIGH_CARD, value: 0, kickers: [], name: 'Incomplete' };
    }
    
    const sortedCards = [...cards].sort((a, b) => b.value - a.value);
    const rankGroups = getRankGroups(sortedCards);
    const groups = rankGroups.map(g => g[0]);
    const values = rankGroups.map(g => g[1]);
    
    // Royal Flush
    const flushCards = sortedCards.filter(c => 
        sortedCards.filter(sc => sc.suit === c.suit).length >= 5
    );
    
    if (flushCards.length >= 5) {
        const flushSorted = flushCards.sort((a, b) => b.value - a.value);
        const straightLow = getStraightLowValue(flushSorted);
        if (straightLow !== null) {
            const isRoyal = flushSorted[0].value === 14 && 
                           flushSorted[1].value === 13 &&
                           flushSorted[2].value === 12 &&
                           flushSorted[3].value === 11 &&
                           flushSorted[4].value === 10;
            return {
                rank: isRoyal ? HAND_RANKINGS.ROYAL_FLUSH : HAND_RANKINGS.STRAIGHT_FLUSH,
                value: straightLow,
                suit: flushCards[0].suit,
                kickers: [],
                name: isRoyal ? 'Royal Flush' : 'Straight Flush'
            };
        }
    }
    
    // Four of a Kind
    if (groups[0] === 4) {
        return {
            rank: HAND_RANKINGS.FOUR_OF_A_KIND,
            value: values[0],
            kickers: [values[1]],
            name: 'Four of a Kind'
        };
    }
    
    // Full House
    if (groups[0] === 3 && groups[1] >= 2) {
        return {
            rank: HAND_RANKINGS.FULL_HOUSE,
            value: values[0],
            kickers: [values[1]],
            name: 'Full House'
        };
    }
    
    // Flush
    if (isFlush(sortedCards)) {
        return {
            rank: HAND_RANKINGS.FLUSH,
            value: sortedCards[0].value,
            suit: sortedCards[0].suit,
            kickers: sortedCards.slice(1, 5).map(c => c.value),
            name: 'Flush'
        };
    }
    
    // Straight
    const straightLow = getStraightLowValue(sortedCards);
    if (straightLow !== null) {
        return {
            rank: HAND_RANKINGS.STRAIGHT,
            value: straightLow,
            kickers: [],
            name: 'Straight'
        };
    }
    
    // Three of a Kind
    if (groups[0] === 3) {
        return {
            rank: HAND_RANKINGS.THREE_OF_A_KIND,
            value: values[0],
            kickers: [values[1], values[2]],
            name: 'Three of a Kind'
        };
    }
    
    // Two Pair
    if (groups[0] === 2 && groups[1] === 2) {
        return {
            rank: HAND_RANKINGS.TWO_PAIR,
            value: Math.max(values[0], values[1]),
            kickers: [Math.min(values[0], values[1]), values[2]],
            name: 'Two Pair'
        };
    }
    
    // One Pair
    if (groups[0] === 2) {
        return {
            rank: HAND_RANKINGS.ONE_PAIR,
            value: values[0],
            kickers: [values[1], values[2], values[3]],
            name: 'One Pair'
        };
    }
    
    // High Card
    return {
        rank: HAND_RANKINGS.HIGH_CARD,
        value: sortedCards[0].value,
        kickers: sortedCards.slice(1, 5).map(c => c.value),
        name: 'High Card'
    };
};

/**
 * Find the best 5-card hand from 7 cards
 * @param {Array} allCards - Array of 7 card objects
 * @returns {Object} Best hand evaluation
 */
const findBestHand = (allCards) => {
    let bestHand = null;
    let bestEvaluation = null;
    
    // Try all combinations of 5 cards from 7
    const combinations = getCombinations(allCards, 5);
    
    for (const combo of combinations) {
        const evaluation = evaluateHand(combo);
        
        if (bestEvaluation === null || isBetterHand(evaluation, bestEvaluation)) {
            bestEvaluation = evaluation;
            bestHand = combo;
        }
    }
    
    return bestEvaluation;
};

/**
 * Get all combinations of k elements from array
 * @param {Array} array - Source array
 * @param {number} k - Size of combinations
 * @returns {Array} Array of combinations
 */
const getCombinations = (array, k) => {
    if (k === 1) return array.map(item => [item]);
    if (k === 0) return [[]];
    
    const results = [];
    for (let i = 0; i <= array.length - k; i++) {
        const head = array.slice(i, i + 1);
        const tail = array.slice(i + 1);
        const tailCombos = getCombinations(tail, k - 1);
        for (const tailCombo of tailCombos) {
            results.push(head.concat(tailCombo));
        }
    }
    
    return results;
};

/**
 * Compare two hand evaluations
 * @param {Object} hand1 - First hand evaluation
 * @param {Object} hand2 - Second hand evaluation
 * @returns {boolean} True if hand1 is better
 */
const isBetterHand = (hand1, hand2) => {
    if (hand1.rank !== hand2.rank) {
        return hand1.rank > hand2.rank;
    }
    
    if (hand1.value !== hand2.value) {
        return hand1.value > hand2.value;
    }
    
    // Compare kickers
    for (let i = 0; i < hand1.kickers.length; i++) {
        if (hand1.kickers[i] !== hand2.kickers[i]) {
            return hand1.kickers[i] > hand2.kickers[i];
        }
    }
    
    return false; // Tie
};

/**
 * Evaluate player's best hand
 * @returns {Object} Hand evaluation
 */
const evaluatePlayerHand = () => {
    const allCards = [...gameState.playerHoleCards, ...gameState.communityCards];
    return findBestHand(allCards);
};

/**
 * Evaluate dealer's best hand
 * @returns {Object} Hand evaluation
 */
const evaluateDealerHand = () => {
    const allCards = [...gameState.dealerHoleCards, ...gameState.communityCards];
    return findBestHand(allCards);
};

// ============================================
// GAME ACTIONS
// ============================================

/**
 * Start a new Texas Hold'em hand
 * @param {number} buyIn - Buy-in amount (ante)
 * @returns {Object} Updated game state
 */
const startHand = (buyIn) => {
    // Reset game state
    gameState = {
        deck: getNewShuffledDeck(),
        playerHoleCards: [],
        dealerHoleCards: [],
        communityCards: [],
        pot: buyIn * 2, // Both player and dealer contribute buy-in
        playerBet: buyIn,
        dealerBet: buyIn,
        currentPhase: 'preflop',
        gameOver: false,
        winner: null,
        playerHandRank: null,
        dealerHandRank: null,
        playerFolded: false
    };
    
    // Deal hole cards
    gameState.playerHoleCards.push(drawCard());
    gameState.dealerHoleCards.push(drawCard());
    gameState.playerHoleCards.push(drawCard());
    gameState.dealerHoleCards.push(drawCard());
    
    // Evaluate initial hand
    gameState.playerHandRank = evaluatePlayerHand();
    
    return gameState;
};

/**
 * Deal the flop (first 3 community cards)
 * @returns {Object} Updated game state
 */
const dealFlop = () => {
    // Burn one card
    drawCard();
    
    // Deal 3 community cards
    gameState.communityCards.push(drawCard());
    gameState.communityCards.push(drawCard());
    gameState.communityCards.push(drawCard());
    
    gameState.currentPhase = 'flop';
    gameState.playerHandRank = evaluatePlayerHand();
    
    return gameState;
};

/**
 * Deal the turn (4th community card)
 * @returns {Object} Updated game state
 */
const dealTurn = () => {
    // Burn one card
    drawCard();
    
    // Deal turn card
    gameState.communityCards.push(drawCard());
    
    gameState.currentPhase = 'turn';
    gameState.playerHandRank = evaluatePlayerHand();
    
    return gameState;
};

/**
 * Deal the river (5th community card)
 * @returns {Object} Updated game state
 */
const dealRiver = () => {
    // Burn one card
    drawCard();
    
    // Deal river card
    gameState.communityCards.push(drawCard());
    
    gameState.currentPhase = 'river';
    gameState.playerHandRank = evaluatePlayerHand();
    
    return gameState;
};

/**
 * Go to showdown
 * @returns {Object} Updated game state
 */
const showdown = () => {
    gameState.currentPhase = 'showdown';
    
    const playerEval = evaluatePlayerHand();
    const dealerEval = evaluateDealerHand();
    
    gameState.playerHandRank = playerEval;
    gameState.dealerHandRank = dealerEval;
    
    if (isBetterHand(playerEval, dealerEval)) {
        gameState.winner = 'player';
    } else if (isBetterHand(dealerEval, playerEval)) {
        gameState.winner = 'dealer';
    } else {
        gameState.winner = 'tie';
    }
    
    gameState.gameOver = true;
    
    return gameState;
};

/**
 * Player folds
 * @returns {Object} Updated game state
 */
const playerFold = () => {
    gameState.playerFolded = true;
    gameState.winner = 'dealer';
    gameState.gameOver = true;
    gameState.currentPhase = 'showdown';
    
    return gameState;
};

/**
 * Player checks
 * @returns {Object} Updated game state
 */
const playerCheck = () => {
    return advanceBetting();
};

/**
 * Player calls
 * @param {number} amount - Additional amount to call
 * @returns {Object} Updated game state
 */
const playerCall = (amount) => {
    gameState.playerBet += amount;
    gameState.pot += amount;
    
    return advanceBetting();
};

/**
 * Player raises
 * @param {number} amount - Total bet amount
 * @returns {Object} Updated game state
 */
const playerRaise = (amount) => {
    gameState.playerBet = amount;
    gameState.pot += (amount - gameState.playerBet);
    
    return advanceBetting();
};

/**
 * Advance to next betting round
 * @returns {Object} Updated game state
 */
const advanceBetting = () => {
    // Dealer AI decision
    const dealerAction = getDealerAction();
    
    switch (gameState.currentPhase) {
        case 'preflop':
            if (dealerAction === 'fold') {
                gameState.winner = 'player';
                gameState.gameOver = true;
            } else {
                dealFlop();
            }
            break;
        case 'flop':
            if (dealerAction === 'fold') {
                gameState.winner = 'player';
                gameState.gameOver = true;
            } else {
                dealTurn();
            }
            break;
        case 'turn':
            if (dealerAction === 'fold') {
                gameState.winner = 'player';
                gameState.gameOver = true;
            } else {
                dealRiver();
            }
            break;
        case 'river':
            if (dealerAction === 'fold') {
                gameState.winner = 'player';
                gameState.gameOver = true;
            } else {
                showdown();
            }
            break;
    }
    
    return gameState;
};

/**
 * Simple dealer AI
 * @returns {string} Action: 'call', 'raise', or 'fold'
 */
const getDealerAction = () => {
    // Always call/check (simple AI for now)
    // Could be enhanced with hand strength evaluation
    return 'call';
};

/**
 * Get amount needed to call
 * @returns {number} Call amount
 */
const getCallAmount = () => {
    // In this simplified version, player always matches dealer bet
    return gameState.dealerBet - gameState.playerBet;
};

/**
 * Get minimum raise amount
 * @returns {number} Minimum raise
 */
const getMinRaise = () => {
    const callAmount = getCallAmount();
    // Minimum raise is the size of the current bet
    return callAmount + gameState.playerBet;
};

/**
 * Reset game state for new hand
 */
const resetGame = () => {
    gameState = {
        deck: [],
        playerHoleCards: [],
        dealerHoleCards: [],
        communityCards: [],
        pot: 0,
        playerBet: 0,
        dealerBet: 0,
        currentPhase: 'idle',
        gameOver: false,
        winner: null,
        playerHandRank: null,
        dealerHandRank: null,
        playerFolded: false
    };
};

/**
 * Get current game state
 * @returns {Object} Current game state
 */
const getGameState = () => gameState;

// ============================================
// CARD RENDERING
// ============================================

/**
 * Create HTML element for a card
 * @param {Object} card - Card object
 * @returns {HTMLElement} Card element
 */
const createCardElement = (card) => {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.color}`;
    
    const face = document.createElement('div');
    face.className = 'card-face';
    
    // Top-left corner
    const topCorner = document.createElement('div');
    topCorner.className = 'card-corner';
    topCorner.innerHTML = `
        <span class="card-value">${RANK_DISPLAY[card.rank]}</span>
        <span class="card-suit">${card.suit}</span>
    `;
    
    // Center
    const center = document.createElement('div');
    center.className = 'card-center';
    center.textContent = card.suit;
    
    // Bottom-right corner
    const bottomCorner = document.createElement('div');
    bottomCorner.className = 'card-corner bottom';
    bottomCorner.innerHTML = `
        <span class="card-value">${RANK_DISPLAY[card.rank]}</span>
        <span class="card-suit">${card.suit}</span>
    `;
    
    face.appendChild(topCorner);
    face.appendChild(center);
    face.appendChild(bottomCorner);
    cardEl.appendChild(face);
    
    return cardEl;
};

/**
 * Create card back element
 * @returns {HTMLElement} Card back element
 */
const createCardBack = () => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-back';
    return cardEl;
};

/**
 * Render cards in a slot
 * @param {HTMLElement} slot - Slot element
 * @param {Object|null} card - Card object or null
 * @param {boolean} faceUp - Whether to show face up
 * @param {number} delay - Animation delay
 */
const renderCard = (slot, card, faceUp = true, delay = 0) => {
    slot.innerHTML = '';
    
    if (!card) {
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder';
        slot.appendChild(placeholder);
        return;
    }
    
    const cardEl = faceUp ? createCardElement(card) : createCardBack();
    cardEl.style.animationDelay = `${delay}s`;
    cardEl.classList.add('dealing');
    slot.appendChild(cardEl);
};

/**
 * Reveal dealer cards
 */
const revealDealerCards = () => {
    const slot1 = document.getElementById('dealerCard1');
    const slot2 = document.getElementById('dealerCard2');
    
    if (gameState.dealerHoleCards[0]) {
        slot1.innerHTML = '';
        const cardEl = createCardElement(gameState.dealerHoleCards[0]);
        cardEl.classList.add('revealing');
        slot1.appendChild(cardEl);
    }
    
    if (gameState.dealerHoleCards[1]) {
        setTimeout(() => {
            slot2.innerHTML = '';
            const cardEl = createCardElement(gameState.dealerHoleCards[1]);
            cardEl.classList.add('revealing');
            slot2.appendChild(cardEl);
        }, 200);
    }
};

/**
 * Render all game cards
 */
const renderAllCards = () => {
    // Player hole cards
    renderCard(document.getElementById('playerCard1'), gameState.playerHoleCards[0], true, 0);
    renderCard(document.getElementById('playerCard2'), gameState.playerHoleCards[1], true, 0.1);
    
    // Dealer hole cards (face down until showdown)
    const dealerFaceUp = gameState.currentPhase === 'showdown' || gameState.gameOver;
    renderCard(document.getElementById('dealerCard1'), 
              dealerFaceUp ? gameState.dealerHoleCards[0] : null, 
              dealerFaceUp, 0.2);
    renderCard(document.getElementById('dealerCard2'), 
              dealerFaceUp ? gameState.dealerHoleCards[1] : null, 
              dealerFaceUp, 0.3);
    
    // Community cards
    const boardSlots = ['boardCard1', 'boardCard2', 'boardCard3', 'boardCard4', 'boardCard5'];
    for (let i = 0; i < 5; i++) {
        const slot = document.getElementById(boardSlots[i]);
        const card = gameState.communityCards[i];
        const delay = 0.4 + (i * 0.1);
        
        if (i < 3 && gameState.currentPhase === 'preflop') {
            renderCard(slot, null, false, delay);
        } else {
            renderCard(slot, card, true, delay);
        }
    }
    
    // Reveal dealer cards at showdown
    if (gameState.currentPhase === 'showdown' && gameState.gameOver) {
        revealDealerCards();
    }
};

/**
 * Update phase indicator
 */
const updatePhaseIndicator = () => {
    const phaseText = document.getElementById('phaseText');
    const phaseNames = {
        'preflop': 'Pre-Flop',
        'flop': 'The Flop',
        'turn': 'The Turn',
        'river': 'The River',
        'showdown': 'Showdown'
    };
    
    if (gameState.currentPhase !== 'idle') {
        phaseText.textContent = phaseNames[gameState.currentPhase] || '';
    } else {
        phaseText.textContent = '';
    }
};

/**
 * Get phase name for display
 * @returns {string} Phase name
 */
const getPhaseName = () => {
    const phaseNames = {
        'preflop': 'Pre-Flop',
        'flop': 'Flop',
        'turn': 'Turn',
        'river': 'River'
    };
    return phaseNames[gameState.currentPhase] || '';
};

// ============================================
// EXPORTS
// ============================================

export const poker = {
    startHand,
    dealFlop,
    dealTurn,
    dealRiver,
    showdown,
    playerFold,
    playerCheck,
    playerCall,
    playerRaise,
    evaluatePlayerHand,
    evaluateDealerHand,
    getCallAmount,
    getMinRaise,
    getGameState,
    resetGame,
    HAND_RANKINGS,
    HAND_NAMES
};

export const renderPoker = {
    renderCard,
    renderAllCards,
    revealDealerCards,
    updatePhaseIndicator,
    getPhaseName,
    createCardElement,
    createCardBack
};

export { SUITS, RANKS, SUIT_COLORS, RANK_VALUES, RANK_DISPLAY };
