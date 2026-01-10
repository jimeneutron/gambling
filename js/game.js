/**
 * Poker Game Engine
 * Texas Hold'em Poker with AI Dealer and Multiplayer Support
 */

// Card Constants
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

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

// Single Player State
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

// AI Configuration
const AI_CONFIG = {
    aggression: 0.7,
    bluffChance: 0.15,
    foldThreshold: 0.3,
    raiseThreshold: 0.7
};

// PokerGame Class
class PokerGame {
    constructor(options = {}) {
        this.isMultiplayer = options.isMultiplayer || false;
        this.groupId = options.groupId || null;
        this.onStateChange = options.onStateChange || (() => {});
        this.onActionRequired = options.onActionRequired || (() => {});
        this.onGameEnd = options.onGameEnd || (() => {});
        this.onMessage = options.onMessage || (() => {});
        
        this.currentState = null;
    }
    
    // Update game state from Firestore (multiplayer)
    updateState(state) {
        this.currentState = state;
        
        if (this.onStateChange) {
            this.onStateChange(state);
        }
        
        // Check if action is required
        if (state.currentPlayerSeat !== undefined && this.isMultiplayer) {
            const players = state.players || {};
            const currentPlayerKey = state.currentPlayerSeat.toString();
            const currentPlayer = players[currentPlayerKey];
            
            if (currentPlayer && !currentPlayer.folded && !currentPlayer.isAllIn) {
                if (this.onActionRequired) {
                    this.onActionRequired(state);
                }
            }
        }
    }
    
    // Handle player actions
    playerAction(action, amount = 0) {
        if (this.isMultiplayer) {
            // Multiplayer actions are handled through Firestore
            if (this.onMessage) {
                this.onMessage(`${action}${amount > 0 ? ' $' + amount : ''}`);
            }
        } else {
            // Single player actions
            this.handleSinglePlayerAction(action, amount);
        }
    }
    
    // Start the game
    start() {
        if (this.isMultiplayer) return;
        
        // Reset and start new hand
        resetSinglePlayerState();
        startHand(100); // $100 buy-in
        
        // Transform state for UI
        const transformedState = this.transformSinglePlayerState();
        this.currentState = transformedState;
        
        if (this.onStateChange) {
            this.onStateChange(transformedState);
        }
    }
    
    // Start a new hand
    startNewHand() {
        if (this.isMultiplayer) return;
        
        resetSinglePlayerState();
        startHand(100);
        
        const transformedState = this.transformSinglePlayerState();
        this.currentState = transformedState;
        
        if (this.onStateChange) {
            this.onStateChange(transformedState);
        }
    }
    
    // Cleanup
    cleanup() {
        this.currentState = null;
    }
    
    // Transform single player state to UI format
    transformSinglePlayerState() {
        return {
            phase: singlePlayerState.currentPhase,
            pot: singlePlayerState.pot,
            communityCards: singlePlayerState.communityCards,
            playerCards: singlePlayerState.playerHoleCards,
            dealerCards: singlePlayerState.dealerHoleCards,
            canCheck: singlePlayerState.playerBet === singlePlayerState.dealerBet,
            currentBet: singlePlayerState.playerBet,
            minRaise: getMinRaise(),
            playerBalance: window.App?.currentUser?.balance || 1000,
            currentPlayer: 'You'
        };
    }
    
    // Handle single player actions
    handleSinglePlayerAction(action, amount) {
        switch(action) {
            case 'fold':
                playerFold();
                break;
            case 'check':
                playerCheck();
                break;
            case 'call':
                playerCall(getCallAmount());
                break;
            case 'raise':
                playerRaise(amount);
                break;
            case 'allin':
                playerRaise(window.App?.currentUser?.balance || 1000);
                break;
        }
        
        // Transform and notify
        const transformedState = this.transformSinglePlayerState();
        this.currentState = transformedState;
        
        if (this.onStateChange) {
            this.onStateChange(transformedState);
        }
        
        // Check if game ended
        if (singlePlayerState.gameOver) {
            if (this.onGameEnd) {
                this.onGameEnd({
                    winner: singlePlayerState.winner,
                    amount: singlePlayerState.pot / 2,
                    handDescription: singlePlayerState.playerHandRank?.name
                });
            }
        } else if (singlePlayerState.currentPhase !== 'idle' && !singlePlayerState.playerFolded) {
            if (this.onActionRequired) {
                this.onActionRequired(transformedState);
            }
        }
    }
}

// Single Player Game Functions
function resetSinglePlayerState() {
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

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank, value: RANK_VALUES[rank] });
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
    return shuffleDeck(createDeck());
}

function drawCard() {
    if (singlePlayerState.deck.length === 0) {
        singlePlayerState.deck = getNewShuffledDeck();
    }
    return singlePlayerState.deck.pop();
}

function startHand(buyIn) {
    singlePlayerState.deck = getNewShuffledDeck();
    singlePlayerState.playerHoleCards = [];
    singlePlayerState.dealerHoleCards = [];
    singlePlayerState.communityCards = [];
    singlePlayerState.pot = buyIn * 2;
    singlePlayerState.playerBet = buyIn;
    singlePlayerState.dealerBet = buyIn;
    singlePlayerState.currentPhase = 'preflop';
    singlePlayerState.gameOver = false;
    singlePlayerState.winner = null;
    singlePlayerState.playerFolded = false;
    
    // Deal hole cards
    singlePlayerState.playerHoleCards.push(drawCard());
    singlePlayerState.dealerHoleCards.push(drawCard());
    singlePlayerState.playerHoleCards.push(drawCard());
    singlePlayerState.dealerHoleCards.push(drawCard());
    
    singlePlayerState.playerHandRank = evaluatePlayerHand();
}

function dealFlop() {
    drawCard(); // Burn card
    singlePlayerState.communityCards.push(drawCard());
    singlePlayerState.communityCards.push(drawCard());
    singlePlayerState.communityCards.push(drawCard());
    singlePlayerState.currentPhase = 'flop';
    singlePlayerState.playerHandRank = evaluatePlayerHand();
}

function dealTurn() {
    drawCard(); // Burn card
    singlePlayerState.communityCards.push(drawCard());
    singlePlayerState.currentPhase = 'turn';
    singlePlayerState.playerHandRank = evaluatePlayerHand();
}

function dealRiver() {
    drawCard(); // Burn card
    singlePlayerState.communityCards.push(drawCard());
    singlePlayerState.currentPhase = 'river';
    singlePlayerState.playerHandRank = evaluatePlayerHand();
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
        singlePlayerState.winner = 'split';
    }
    
    singlePlayerState.gameOver = true;
}

function playerFold() {
    singlePlayerState.playerFolded = true;
    singlePlayerState.winner = 'dealer';
    singlePlayerState.gameOver = true;
    singlePlayerState.currentPhase = 'showdown';
}

function playerCheck() {
    advanceBetting();
}

function playerCall(amount) {
    singlePlayerState.playerBet += amount;
    singlePlayerState.pot += amount;
    advanceBetting();
}

function playerRaise(amount) {
    singlePlayerState.playerBet = amount;
    singlePlayerState.pot += (amount - singlePlayerState.playerBet);
    advanceBetting();
}

function getCallAmount() {
    return singlePlayerState.dealerBet - singlePlayerState.playerBet;
}

function getMinRaise() {
    const callAmount = getCallAmount();
    return callAmount + singlePlayerState.playerBet;
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
    
    switch(singlePlayerState.currentPhase) {
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
}

// Hand Evaluation
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
    
    // Wheel check (A-2-3-4-5)
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

function evaluatePlayerHand() {
    const allCards = [...singlePlayerState.playerHoleCards, ...singlePlayerState.communityCards];
    return findBestHand(allCards);
}

function evaluateDealerHand() {
    const allCards = [...singlePlayerState.dealerHoleCards, ...singlePlayerState.communityCards];
    return findBestHand(allCards);
}

// AI Dealer
function getHandStrength(holeCards, communityCards) {
    if (communityCards.length === 0) {
        // Pre-flop strength
        const rank1 = holeCards[0].value;
        const rank2 = holeCards[1].value;
        const suited = holeCards[0].suit === holeCards[1].suit;
        
        let strength = 0;
        
        // Pocket pairs
        if (rank1 === rank2) {
            if (rank1 >= 12) strength = 0.95;
            else if (rank1 >= 10) strength = 0.85;
            else if (rank1 >= 8) strength = 0.75;
            else strength = 0.6;
        }
        // Suited connectors
        else if (suited && Math.abs(rank1 - rank2) <= 4) {
            if (rank1 >= 11 || rank2 >= 11) strength = 0.7;
            else if (rank1 >= 9 || rank2 >= 9) strength = 0.55;
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
    
    // Post-flop strength
    const allCards = [...holeCards, ...communityCards];
    const bestHand = findBestHand(allCards);
    const baseStrength = (bestHand.rank - 1) / 9;
    const valueBonus = bestHand.value / 14 * 0.2;
    
    let kickerBonus = 0;
    if (bestHand.kickers && bestHand.kickers.length > 0) {
        kickerBonus = Math.min(bestHand.kickers[0] / 14 * 0.1, 0.1);
    }
    
    return Math.min(baseStrength + valueBonus + kickerBonus, 1);
}

function shouldDealerFold(holeCards, communityCards, pot, currentBet) {
    const strength = getHandStrength(holeCards, communityCards);
    
    if (currentBet === 0) return false;
    
    const callAmount = currentBet;
    const potOdds = callAmount / (pot + callAmount);
    
    if (potOdds < 0.2) {
        return strength < AI_CONFIG.foldThreshold * 0.7;
    }
    
    if (strength > 0.8 && Math.random() < 0.05) return true;
    
    return strength < AI_CONFIG.foldThreshold;
}

function shouldDealerRaise(holeCards, communityCards, pot, currentBet, minRaise, maxRaise) {
    const strength = getHandStrength(holeCards, communityCards);
    
    if (currentBet === 0) {
        return strength > AI_CONFIG.raiseThreshold;
    }
    
    const raiseChance = (strength - AI_CONFIG.raiseThreshold) / (1 - AI_CONFIG.raiseThreshold);
    const adjustedChance = raiseChance * 0.85;
    
    const isBluffing = strength < 0.4 && Math.random() < AI_CONFIG.bluffChance;
    
    if (strength > AI_CONFIG.raiseThreshold || isBluffing) {
        if (Math.random() < adjustedChance || isBluffing) {
            if (isBluffing) {
                return Math.min(pot * 0.75, maxRaise);
            }
            
            const strengthMultiplier = 1 + (strength - 0.7) * 2;
            const raiseAmount = Math.min(
                minRaise * strengthMultiplier,
                Math.min(maxRaise, pot * 2.0)
            );
            
            return Math.max(raiseAmount, minRaise);
        }
    }
    
    return null;
}

function getDealerAIAction(holeCards, communityCards, pot, currentBet, minRaise, maxRaise) {
    if (shouldDealerFold(holeCards, communityCards, pot, currentBet)) {
        return { action: 'fold' };
    }
    
    const raiseAmount = shouldDealerRaise(holeCards, communityCards, pot, currentBet, minRaise, maxRaise);
    
    if (raiseAmount !== null) {
        return { action: 'raise', amount: raiseAmount };
    }
    
    return { action: currentBet > 0 ? 'call' : 'check' };
}

// Export to window
window.PokerGame = PokerGame;
window.poker = {
    evaluatePlayerHand,
    evaluateDealerHand,
    getHandStrength,
    getGameState: () => singlePlayerState,
    resetGame: resetSinglePlayerState,
    HAND_RANKINGS,
    HAND_NAMES
};
