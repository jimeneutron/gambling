/**
 * CasinoSim - Texas Hold'em Poker Game Logic
 * ============================================
 * Complete poker engine with hand evaluation, betting rounds, and showdown
 * Fixed: Works without ES6 modules for local file access
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
    currentPhase: 'idle',
    gameOver: false,
    winner: null,
    playerHandRank: null,
    dealerHandRank: null,
    playerFolded: false
};

// ============================================
// DECK MANAGEMENT
// ============================================

function createDeck() {
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
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
}

function getNewShuffledDeck() {
    const deck = createDeck();
    return shuffleDeck(deck);
}

function drawCard() {
    if (gameState.deck.length === 0) {
        gameState.deck = getNewShuffledDeck();
    }
    return gameState.deck.pop();
}

// ============================================
// HAND EVALUATION
// ============================================

function getCardValues(cards) {
    return cards.map(c => c.value).sort((a, b) => a - b);
}

function isFlush(cards) {
    if (cards.length < 5) return false;
    const firstSuit = cards[0].suit;
    return cards.every(card => card.suit === firstSuit);
}

function isStraight(cards) {
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
}

function getStraightLowValue(cards) {
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
}

function countRanks(cards) {
    const counts = {};
    for (const card of cards) {
        counts[card.value] = (counts[card.value] || 0) + 1;
    }
    return counts;
}

function getRankGroups(cards) {
    const counts = countRanks(cards);
    return Object.entries(counts)
        .map(([value, count]) => [parseInt(count), parseInt(value)])
        .sort((a, b) => {
            if (a[0] !== b[0]) return b[0] - a[0];
            return b[1] - a[1];
        });
}

function evaluateHand(cards) {
    if (cards.length < 5) {
        return { rank: HAND_RANKINGS.HIGH_CARD, value: 0, kickers: [], name: 'Incomplete' };
    }
    
    const sortedCards = [...cards].sort((a, b) => b.value - a.value);
    const rankGroups = getRankGroups(sortedCards);
    const groups = rankGroups.map(g => g[0]);
    const values = rankGroups.map(g => g[1]);
    
    // Royal Flush and Straight Flush
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
}

function getCombinations(array, k) {
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
}

function findBestHand(allCards) {
    let bestHand = null;
    let bestEvaluation = null;
    
    const combinations = getCombinations(allCards, 5);
    
    for (const combo of combinations) {
        const evaluation = evaluateHand(combo);
        
        if (bestEvaluation === null || isBetterHand(evaluation, bestEvaluation)) {
            bestEvaluation = evaluation;
            bestHand = combo;
        }
    }
    
    return bestEvaluation;
}

function isBetterHand(hand1, hand2) {
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
    
    return false;
}

function evaluatePlayerHand() {
    const allCards = [...gameState.playerHoleCards, ...gameState.communityCards];
    return findBestHand(allCards);
}

function evaluateDealerHand() {
    const allCards = [...gameState.dealerHoleCards, ...gameState.communityCards];
    return findBestHand(allCards);
}

// ============================================
// GAME ACTIONS
// ============================================

function startHand(buyIn) {
    gameState = {
        deck: getNewShuffledDeck(),
        playerHoleCards: [],
        dealerHoleCards: [],
        communityCards: [],
        pot: buyIn * 2,
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
    
    gameState.playerHandRank = evaluatePlayerHand();
    
    return gameState;
}

function dealFlop() {
    drawCard();
    gameState.communityCards.push(drawCard());
    gameState.communityCards.push(drawCard());
    gameState.communityCards.push(drawCard());
    
    gameState.currentPhase = 'flop';
    gameState.playerHandRank = evaluatePlayerHand();
    
    return gameState;
}

function dealTurn() {
    drawCard();
    gameState.communityCards.push(drawCard());
    
    gameState.currentPhase = 'turn';
    gameState.playerHandRank = evaluatePlayerHand();
    
    return gameState;
}

function dealRiver() {
    drawCard();
    gameState.communityCards.push(drawCard());
    
    gameState.currentPhase = 'river';
    gameState.playerHandRank = evaluatePlayerHand();
    
    return gameState;
}

function showdown() {
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
}

function playerFold() {
    gameState.playerFolded = true;
    gameState.winner = 'dealer';
    gameState.gameOver = true;
    gameState.currentPhase = 'showdown';
    
    return gameState;
}

function playerCheck() {
    return advanceBetting();
}

function playerCall(amount) {
    gameState.playerBet += amount;
    gameState.pot += amount;
    
    return advanceBetting();
}

function playerRaise(amount) {
    gameState.playerBet = amount;
    gameState.pot += (amount - gameState.playerBet);
    
    return advanceBetting();
}

function getDealerAction() {
    return 'call';
}

function getCallAmount() {
    return gameState.dealerBet - gameState.playerBet;
}

function getMinRaise() {
    const callAmount = getCallAmount();
    return callAmount + gameState.playerBet;
}

function resetGame() {
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
}

function getGameState() {
    return gameState;
}

function advanceBetting() {
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
}

// ============================================
// CARD RENDERING
// ============================================

function createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.color}`;
    
    const face = document.createElement('div');
    face.className = 'card-face';
    
    const topCorner = document.createElement('div');
    topCorner.className = 'card-corner';
    topCorner.innerHTML = `
        <span class="card-value">${RANK_DISPLAY[card.rank]}</span>
        <span class="card-suit">${card.suit}</span>
    `;
    
    const center = document.createElement('div');
    center.className = 'card-center';
    center.textContent = card.suit;
    
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
}

function createCardBack() {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-back';
    return cardEl;
}

function renderCard(slot, card, faceUp = true, delay = 0) {
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
}

function revealDealerCards() {
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
}

function renderAllCards() {
    renderCard(document.getElementById('playerCard1'), gameState.playerHoleCards[0], true, 0);
    renderCard(document.getElementById('playerCard2'), gameState.playerHoleCards[1], true, 0.1);
    
    const dealerFaceUp = gameState.currentPhase === 'showdown' || gameState.gameOver;
    renderCard(document.getElementById('dealerCard1'), 
              dealerFaceUp ? gameState.dealerHoleCards[0] : null, 
              dealerFaceUp, 0.2);
    renderCard(document.getElementById('dealerCard2'), 
              dealerFaceUp ? gameState.dealerHoleCards[1] : null, 
              dealerFaceUp, 0.3);
    
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
    
    if (gameState.currentPhase === 'showdown' && gameState.gameOver) {
        revealDealerCards();
    }
}

function updatePhaseIndicator() {
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
}

function getPhaseName() {
    const phaseNames = {
        'preflop': 'Pre-Flop',
        'flop': 'Flop',
        'turn': 'Turn',
        'river': 'River'
    };
    return phaseNames[gameState.currentPhase] || '';
}

// ============================================
// GLOBAL EXPORTS (for compatibility)
// ============================================

window.poker = {
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

window.renderPoker = {
    renderCard,
    renderAllCards,
    revealDealerCards,
    updatePhaseIndicator,
    getPhaseName,
    createCardElement,
    createCardBack
};
