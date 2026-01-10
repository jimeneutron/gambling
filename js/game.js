/**
 * CasinoSim - Texas Hold'em Poker Game Logic
 * ============================================
 * Complete poker engine with AI dealer, hand evaluation, betting, and multiplayer support
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
    players: {},  // Multiple players supported
    communityCards: [],
    pot: 0,
    currentPlayerIndex: 0,
    currentPhase: 'idle',
    gameOver: false,
    winner: null,
    dealerHandRank: null,
    lastAction: null,
    isMultiplayer: false,
    roomId: null
};

// Default single-player state
let singlePlayerState = {
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
// AI DEALER CONFIGURATION
// ============================================

const AI_CONFIG = {
    aggression: 0.7,        // 0-1, higher = more aggressive
    bluffChance: 0.15,      // 15% chance to bluff with weak hands
    foldThreshold: 0.3,     // Fold if hand strength below this
    raiseThreshold: 0.7,    // Raise if hand strength above this
    callFrequency: 0.85,    // Frequency of calling vs raising
    minBetMultiplier: 0.5,  // Min bet as % of pot
    maxBetMultiplier: 2.0,  // Max bet as % of pot
    reactionDelay: 800      // AI think time in ms
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
    
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && 
        uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return true;
    }
    
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
    
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && 
        uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return 1;
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
    
    for (let i = 0; i < hand1.kickers.length; i++) {
        if (hand1.kickers[i] !== hand2.kickers[i]) {
            return hand1.kickers[i] > hand2.kickers[i];
        }
    }
    
    return false;
}

// ============================================
// AI DEALER LOGIC
// ============================================

function getHandStrength(holeCards, communityCards) {
    if (communityCards.length === 0) {
        // Pre-flop hand strength
        const rank1 = holeCards[0].value;
        const rank2 = holeCards[1].value;
        const suited = holeCards[0].suit === holeCards[1].suit;
        
        let strength = 0;
        
        // Pocket pairs
        if (rank1 === rank2) {
            if (rank1 >= 12) strength = 0.95; // AA, KK, QQ
            else if (rank1 >= 10) strength = 0.85; // JJ, TT
            else if (rank1 >= 8) strength = 0.75; // 99, 88
            else strength = 0.6;
        }
        // Suited connectors
        else if (suited && Math.abs(rank1 - rank2) <= 4) {
            if (rank1 >= 11 || rank2 >= 11) strength = 0.7; // AK, AQ, KQ suited
            else if (rank1 >= 9 || rank2 >= 9) strength = 0.55; // Jx, Tx suited
            else strength = 0.45;
        }
        // High cards
        else if (rank1 >= 12 || rank2 >= 12) {
            strength = 0.5;
        }
        // Ace with low
        else if (rank1 === 14 || rank2 === 14) {
            strength = 0.4;
        }
        else {
            strength = 0.25;
        }
        
        return strength;
    }
    
    // Post-flop hand strength using actual evaluation
    const allCards = [...holeCards, ...communityCards];
    const bestHand = findBestHand(allCards);
    
    // Convert hand rank to strength (0-1)
    const baseStrength = (bestHand.rank - 1) / 9; // Normalize to 0-1
    
    // Add value-based strength
    const valueBonus = bestHand.value / 14 * 0.2;
    
    // Consider kickers for pairs
    let kickerBonus = 0;
    if (bestHand.kickers && bestHand.kickers.length > 0) {
        kickerBonus = Math.min(bestHand.kickers[0] / 14 * 0.1, 0.1);
    }
    
    return Math.min(baseStrength + valueBonus + kickerBonus, 1);
}

function shouldDealerFold(holeCards, communityCards, pot, currentBet) {
    const strength = getHandStrength(holeCards, communityCards);
    
    // Always call if checking (no bet to match)
    if (currentBet === 0) return false;
    
    // Calculate pot odds
    const callAmount = currentBet;
    const potOdds = callAmount / (pot + callAmount);
    
    // If pot odds are favorable, call more often
    if (potOdds < 0.2) {
        return strength < AI_CONFIG.foldThreshold * 0.7;
    }
    
    // Bluff detection - sometimes fold strong hands to trick player
    if (strength > 0.8 && Math.random() < 0.05) {
        return true; // Occasional slow-play/fold trap
    }
    
    return strength < AI_CONFIG.foldThreshold;
}

function shouldDealerRaise(holeCards, communityCards, pot, currentBet, minRaise, maxRaise) {
    const strength = getHandStrength(holeCards, communityCards);
    
    // Don't raise if check is available
    if (currentBet === 0) {
        return strength > AI_CONFIG.raiseThreshold;
    }
    
    // Determine raise frequency based on hand strength
    const raiseChance = (strength - AI_CONFIG.raiseThreshold) / (1 - AI_CONFIG.raiseThreshold);
    const adjustedChance = raiseChance * AI_CONFIG.callFrequency;
    
    // Add bluff chance
    const isBluffing = strength < 0.4 && Math.random() < AI_CONFIG.bluffChance;
    
    if (strength > AI_CONFIG.raiseThreshold || isBluffing) {
        if (Math.random() < adjustedChance || isBluffing) {
            // Calculate raise amount
            const baseRaise = minRaise;
            const maxPossibleRaise = Math.min(maxRaise, pot * AI_CONFIG.maxBetMultiplier);
            
            if (isBluffing) {
                // Bluffs go big
                return Math.min(pot * 0.75, maxRaise);
            }
            
            // Value bets scale with hand strength
            const strengthMultiplier = 1 + (strength - 0.7) * 2;
            const raiseAmount = Math.min(
                baseRaise * strengthMultiplier,
                maxPossibleRaise
            );
            
            return Math.max(raiseAmount, minRaise);
        }
    }
    
    return null; // Don't raise
}

function getDealerAIAction(holeCards, communityCards, pot, currentBet, minRaise, maxRaise) {
    // Check if should fold
    if (shouldDealerFold(holeCards, communityCards, pot, currentBet)) {
        return { action: 'fold' };
    }
    
    // Check if should raise
    const raiseAmount = shouldDealerRaise(
        holeCards, communityCards, pot, currentBet, minRaise, maxRaise
    );
    
    if (raiseAmount !== null) {
        return { action: 'raise', amount: raiseAmount };
    }
    
    // Default to call/check
    return { action: currentBet > 0 ? 'call' : 'check' };
}

// ============================================
// MULTIPLAYER SUPPORT
// ============================================

let multiplayerRoom = null;
let playerCallbacks = {};

function createRoom(hostName) {
    const roomId = generateRoomId();
    multiplayerRoom = {
        id: roomId,
        host: hostName,
        players: {},
        gameState: null,
        createdAt: Date.now()
    };
    
    gameState.isMultiplayer = true;
    gameState.roomId = roomId;
    
    console.log(`🏠 Room created: ${roomId}`);
    return roomId;
}

function joinRoom(roomId, playerName, playerId) {
    if (!multiplayerRoom || multiplayerRoom.id !== roomId) {
        // Try to load room from Firebase (would be implemented with real backend)
        multiplayerRoom = {
            id: roomId,
            players: {},
            gameState: null,
            createdAt: Date.now()
        };
    }
    
    multiplayerRoom.players[playerId] = {
        id: playerId,
        name: playerName,
        holeCards: [],
        bet: 0,
        folded: false,
        balance: 1000
    };
    
    gameState.isMultiplayer = true;
    gameState.roomId = roomId;
    
    console.log(`👤 ${playerName} joined room ${roomId}`);
    return multiplayerRoom;
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function subscribeToRoomUpdates(callback) {
    if (playerCallbacks.update) {
        playerCallbacks.update = callback;
    } else {
        playerCallbacks.update = callback;
    }
}

function broadcastRoomUpdate() {
    if (playerCallbacks.update && multiplayerRoom) {
        playerCallbacks.update(multiplayerRoom);
    }
}

// ============================================
// GAME ACTIONS - SINGLE PLAYER
// ============================================

function startHand(buyIn) {
    singlePlayerState = {
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
    singlePlayerState.playerHoleCards.push(drawCard());
    singlePlayerState.dealerHoleCards.push(drawCard());
    singlePlayerState.playerHoleCards.push(drawCard());
    singlePlayerState.dealerHoleCards.push(drawCard());
    
    singlePlayerState.playerHandRank = evaluatePlayerHand();
    
    return singlePlayerState;
}

function dealFlop() {
    drawCard();
    singlePlayerState.communityCards.push(drawCard());
    singlePlayerState.communityCards.push(drawCard());
    singlePlayerState.communityCards.push(drawCard());
    
    singlePlayerState.currentPhase = 'flop';
    singlePlayerState.playerHandRank = evaluatePlayerHand();
    
    return singlePlayerState;
}

function dealTurn() {
    drawCard();
    singlePlayerState.communityCards.push(drawCard());
    
    singlePlayerState.currentPhase = 'turn';
    singlePlayerState.playerHandRank = evaluatePlayerHand();
    
    return singlePlayerState;
}

function dealRiver() {
    drawCard();
    singlePlayerState.communityCards.push(drawCard());
    
    singlePlayerState.currentPhase = 'river';
    singlePlayerState.playerHandRank = evaluatePlayerHand();
    
    return singlePlayerState;
}

function showdown() {
    singlePlayerState.currentPhase = 'showdown';
    
    const playerEval = evaluatePlayerHand();
    const dealerEval = evaluateDealerHand();
    
    singlePlayerState.playerHandRank = playerEval;
    singlePlayerState.dealerHandRank = dealerEval;
    
    if (isBetterHand(playerEval, dealerEval)) {
        singlePlayerState.winner = 'player';
    } else if (isBetterHand(dealerEval, playerEval)) {
        singlePlayerState.winner = 'dealer';
    } else {
        singlePlayerState.winner = 'tie';
    }
    
    singlePlayerState.gameOver = true;
    
    return singlePlayerState;
}

function playerFold() {
    singlePlayerState.playerFolded = true;
    singlePlayerState.winner = 'dealer';
    singlePlayerState.gameOver = true;
    singlePlayerState.currentPhase = 'showdown';
    
    return singlePlayerState;
}

function playerCheck() {
    return advanceBetting();
}

function playerCall(amount) {
    singlePlayerState.playerBet += amount;
    singlePlayerState.pot += amount;
    
    return advanceBetting();
}

function playerRaise(amount) {
    singlePlayerState.playerBet = amount;
    singlePlayerState.pot += (amount - singlePlayerState.playerBet);
    
    return advanceBetting();
}

function getCallAmount() {
    return singlePlayerState.dealerBet - singlePlayerState.playerBet;
}

function getMinRaise() {
    const callAmount = getCallAmount();
    return callAmount + singlePlayerState.playerBet;
}

function resetGame() {
    singlePlayerState = {
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
    return singlePlayerState;
}

function advanceBetting() {
    // Get dealer action using AI
    const dealerAction = getDealerAIAction(
        singlePlayerState.dealerHoleCards,
        singlePlayerState.communityCards,
        singlePlayerState.pot,
        singlePlayerState.dealerBet - singlePlayerState.playerBet,
        getMinRaise(),
        singlePlayerState.playerBet + singlePlayerState.pot
    );
    
    singlePlayerState.lastAction = `Dealer ${dealerAction.action}`;
    
    switch (singlePlayerState.currentPhase) {
        case 'preflop':
            if (dealerAction.action === 'fold') {
                singlePlayerState.winner = 'player';
                singlePlayerState.gameOver = true;
            } else if (dealerAction.action === 'raise') {
                singlePlayerState.dealerBet = dealerAction.amount;
                singlePlayerState.pot += (dealerAction.amount - singlePlayerState.playerBet);
                singlePlayerState.playerBet = dealerAction.amount;
            } else if (dealerAction.action === 'call') {
                const callAmount = singlePlayerState.dealerBet - singlePlayerState.playerBet;
                singlePlayerState.dealerBet += callAmount;
                singlePlayerState.pot += callAmount;
                dealFlop();
            } else {
                dealFlop();
            }
            break;
        case 'flop':
            if (dealerAction.action === 'fold') {
                singlePlayerState.winner = 'player';
                singlePlayerState.gameOver = true;
            } else if (dealerAction.action === 'raise') {
                singlePlayerState.dealerBet = dealerAction.amount;
                singlePlayerState.pot += (dealerAction.amount - singlePlayerState.playerBet);
                singlePlayerState.playerBet = dealerAction.amount;
            } else if (dealerAction.action === 'call') {
                const callAmount = singlePlayerState.dealerBet - singlePlayerState.playerBet;
                singlePlayerState.dealerBet += callAmount;
                singlePlayerState.pot += callAmount;
                dealTurn();
            } else {
                dealTurn();
            }
            break;
        case 'turn':
            if (dealerAction.action === 'fold') {
                singlePlayerState.winner = 'player';
                singlePlayerState.gameOver = true;
            } else if (dealerAction.action === 'raise') {
                singlePlayerState.dealerBet = dealerAction.amount;
                singlePlayerState.pot += (dealerAction.amount - singlePlayerState.playerBet);
                singlePlayerState.playerBet = dealerAction.amount;
            } else if (dealerAction.action === 'call') {
                const callAmount = singlePlayerState.dealerBet - singlePlayerState.playerBet;
                singlePlayerState.dealerBet += callAmount;
                singlePlayerState.pot += callAmount;
                dealRiver();
            } else {
                dealRiver();
            }
            break;
        case 'river':
            if (dealerAction.action === 'fold') {
                singlePlayerState.winner = 'player';
                singlePlayerState.gameOver = true;
            } else if (dealerAction.action === 'raise') {
                singlePlayerState.dealerBet = dealerAction.amount;
                singlePlayerState.pot += (dealerAction.amount - singlePlayerState.playerBet);
                singlePlayerState.playerBet = dealerAction.amount;
            } else if (dealerAction.action === 'call') {
                const callAmount = singlePlayerState.dealerBet - singlePlayerState.playerBet;
                singlePlayerState.dealerBet += callAmount;
                singlePlayerState.pot += callAmount;
                showdown();
            } else {
                showdown();
            }
            break;
    }
    
    return singlePlayerState;
}

// ============================================
// HAND EVALUATION FUNCTIONS
// ============================================

function evaluatePlayerHand() {
    const allCards = [...singlePlayerState.playerHoleCards, ...singlePlayerState.communityCards];
    return findBestHand(allCards);
}

function evaluateDealerHand() {
    const allCards = [...singlePlayerState.dealerHoleCards, ...singlePlayerState.communityCards];
    return findBestHand(allCards);
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
    
    if (singlePlayerState.dealerHoleCards[0]) {
        slot1.innerHTML = '';
        const cardEl = createCardElement(singlePlayerState.dealerHoleCards[0]);
        cardEl.classList.add('revealing');
        slot1.appendChild(cardEl);
    }
    
    if (singlePlayerState.dealerHoleCards[1]) {
        setTimeout(() => {
            slot2.innerHTML = '';
            const cardEl = createCardElement(singlePlayerState.dealerHoleCards[1]);
            cardEl.classList.add('revealing');
            slot2.appendChild(cardEl);
        }, 200);
    }
}

function renderAllCards() {
    renderCard(document.getElementById('playerCard1'), singlePlayerState.playerHoleCards[0], true, 0);
    renderCard(document.getElementById('playerCard2'), singlePlayerState.playerHoleCards[1], true, 0.1);
    
    const dealerFaceUp = singlePlayerState.currentPhase === 'showdown' || singlePlayerState.gameOver;
    renderCard(document.getElementById('dealerCard1'), 
              dealerFaceUp ? singlePlayerState.dealerHoleCards[0] : null, 
              dealerFaceUp, 0.2);
    renderCard(document.getElementById('dealerCard2'), 
              dealerFaceUp ? singlePlayerState.dealerHoleCards[1] : null, 
              dealerFaceUp, 0.3);
    
    const boardSlots = ['boardCard1', 'boardCard2', 'boardCard3', 'boardCard4', 'boardCard5'];
    for (let i = 0; i < 5; i++) {
        const slot = document.getElementById(boardSlots[i]);
        const card = singlePlayerState.communityCards[i];
        const delay = 0.4 + (i * 0.1);
        
        if (i < 3 && singlePlayerState.currentPhase === 'preflop') {
            renderCard(slot, null, false, delay);
        } else {
            renderCard(slot, card, true, delay);
        }
    }
    
    if (singlePlayerState.currentPhase === 'showdown' && singlePlayerState.gameOver) {
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
    
    if (singlePlayerState.currentPhase !== 'idle') {
        phaseText.textContent = phaseNames[singlePlayerState.currentPhase] || '';
        
        // Add dealer action info
        if (singlePlayerState.lastAction && singlePlayerState.currentPhase !== 'showdown') {
            phaseText.textContent += ` • ${singlePlayerState.lastAction}`;
        }
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
    return phaseNames[singlePlayerState.currentPhase] || '';
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.poker = {
    // Single player
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
    HAND_NAMES,
    
    // AI Dealer
    getDealerAIAction,
    getHandStrength,
    AI_CONFIG,
    
    // Multiplayer
    createRoom,
    joinRoom,
    subscribeToRoomUpdates,
    broadcastRoomUpdate,
    isMultiplayer: () => gameState.isMultiplayer
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
