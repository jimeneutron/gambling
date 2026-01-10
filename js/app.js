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
                }
            });
            
            // Re-fetch the document after creating it
            groupDoc = await groupRef.get();
        }
        
        // Find an available seat
        const groupData = groupDoc.data();
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
