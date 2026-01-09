# CasinoSim - Texas Hold'em Poker

A premium online Texas Hold'em poker game built with vanilla JavaScript, Firebase, and hosted on GitHub Pages. This is a social casino simulation using virtual currency only.

## 🎰 Features

- **Authentic Texas Hold'em Experience** - Complete poker with all betting rounds
- **Buy-In System** - Pay an ante to receive hole cards and compete for the pot
- **Complete Hand Evaluation** - Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, One Pair, High Card
- **Betting Rounds** - Pre-Flop, Flop, Turn, River, and Showdown
- **Chip System** - Multiple chip denominations ($50 - $1,000)
- **Real-time Balance** - Firebase Firestore integration for persistent user data
- **Google & Anonymous Login** - Flexible authentication options
- **Responsive Design** - Play on desktop, tablet, or mobile
- **Smooth Animations** - Card dealing and reveal animations
- **Social Casino** - Virtual currency only, no real money gambling

## 🚀 Quick Start

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable **Google** provider
   - Enable **Anonymous** provider
4. Create **Firestore Database**:
   - Go to Firestore Database > Create database
   - Start in **test mode** for development
5. Get your config:
   - Go to Project Settings > General > Your apps > Web app
   - Copy the `firebaseConfig` object

### 2. Configure the App

Edit `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Local Development

Open `index.html` in your browser:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

### 4. Deploy to GitHub Pages

1. Create a GitHub repository
2. Push your code:

```bash
git init
git add .
git commit -m "Initial commit: CasinoSim Texas Hold'em"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to Repository Settings > Pages
   - Source: "main" branch
   - Save

4. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## 📁 Project Structure

```
CasinoSim/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # All styling (responsive poker table)
├── js/
│   ├── firebase-config.js # Firebase setup & auth
│   ├── app.js            # Main application logic
│   └── game.js           # Texas Hold'em game engine
├── user_input_files/      # Your assets (chips, cards, table background)
└── README.md
```

## 🎮 Game Rules

### Objective
Make the best 5-card poker hand using your 2 hole cards and the 5 community cards to win the pot.

### How to Play

1. **Buy In** - Select your buy-in amount to receive hole cards
2. **Pre-Flop** - Review your hole cards and make your first decision
3. **The Flop** - 3 community cards are revealed
4. **The Turn** - 4th community card is revealed
5. **The River** - 5th and final community card is revealed
6. **Showdown** - Best hand wins!

### Betting Actions

- **Fold** - Give up your hand and forfeit the pot
- **Check** - Pass action to the next player (when no bet to match)
- **Call** - Match the current bet to stay in the hand
- **Raise** - Increase the bet amount

### Hand Rankings (Highest to Lowest)

1. **Royal Flush** - A, K, Q, J, 10 of the same suit
2. **Straight Flush** - Five sequential cards of the same suit
3. **Four of a Kind** - Four cards of the same rank
4. **Full House** - Three of a kind plus a pair
5. **Flush** - Five cards of the same suit
6. **Straight** - Five sequential cards (A-2-3-4-5 counts as lowest)
7. **Three of a Kind** - Three cards of the same rank
8. **Two Pair** - Two different pairs
9. **One Pair** - Two cards of the same rank
10. **High Card** - Highest card wins when no other hand is made

### Buy-In System

- Pay the buy-in (ante) to receive your hole cards
- Both you and the dealer contribute to the pot
- Win the entire pot by having the best hand at showdown
- Split the pot if both hands are equal

## 🔧 Customization

### Changing Starting Balance
Edit `js/firebase-config.js`:
```javascript
const DEFAULT_BALANCE = 1000; // Change this value
```

### Adding New Buy-In Amounts
Edit `index.html` and add new button:
```html
<button class="buy-in-btn" data-amount="2500">$2500</button>
```

### Changing Colors
Edit `css/style.css` - CSS variables at the top:
```css
:root {
    --poker-green: #35654d;
    --accent-gold: #FFD700;
    /* ... */
}
```

### Adjusting Minimum Raise
In `js/app.js`, modify the raise calculation in `handleBetSliderChange`.

## 🛠️ Technical Details

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Firebase (Authentication + Firestore)
- **Hosting**: GitHub Pages
- **No Build Step Required**: Pure vanilla JS, works directly in browser

### Hand Evaluation Algorithm

The game uses a complete 7-card evaluation algorithm:
- Analyzes all 5-card combinations from 7 cards (2 hole + 5 community)
- Identifies the best possible hand
- Handles tie-breakers using kicker cards
- Supports A-2-3-4-5 wheel straights

## ⚠️ Legal Disclaimer

This is a **social casino simulation** using virtual currency only. It does not involve:
- Real money gambling
- Real money payouts
- Cash prizes

This project is for educational and entertainment purposes only.

## 📝 License

MIT License - Feel free to use and modify for your own projects.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using vanilla JavaScript and Firebase
