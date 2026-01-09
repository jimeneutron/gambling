# Deploy to GitHub Pages

## Option 1: Deploy from Main Branch (Easiest)

### Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **+** button in the top right, select **New repository**
3. Fill in the details:
   - **Repository name**: `casino-sim` (or your preferred name)
   - **Description**: Texas Hold'em Poker Game
   - **Visibility**: Public (free) or Private
4. Click **Create repository**

### Step 2: Push Your Code

Run these commands in your terminal:

```bash
# Navigate to your project directory
cd /workspace

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit: CasinoSim Texas Hold'em Poker"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/casino-sim.git

# Push to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username and `casino-sim` with your repository name.

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. In the left sidebar, click **Pages**
4. Under **Source**, select:
   - **Branch**: `main` (or `master`)
   - **Folder**: `/(root)`
5. Click **Save**
6. Wait 1-2 minutes for the site to deploy

### Step 4: Access Your Site

Your game will be live at:
```
https://YOUR_USERNAME.github.io/casino-sim/
```

---

## Option 2: Deploy from gh-pages Branch

If you prefer to keep your source code on main but deploy from a separate branch:

```bash
# Create gh-pages branch
git checkout -b gh-pages

# Push gh-pages branch
git push -u origin gh-pages

# Go back to main branch
git checkout main
```

Then enable GitHub Pages from the `gh-pages` branch in Settings.

---

## Option 3: Deploy from /docs Folder

Put your files in a `docs` folder and enable GitHub Pages from the `/docs` folder:

```bash
# Create docs folder if it doesn't exist
mkdir -p docs

# Copy all files to docs
cp -r * docs/

# But exclude the docs folder itself from copying
cd docs
rm -rf docs

# Commit and push
git add docs
git commit -m "Add docs folder for GitHub Pages"
git push
```

Then enable GitHub Pages from the `/docs` folder in Settings.

---

## File Structure Requirements

GitHub Pages requires this structure:

```
casino-sim/
├── index.html          # Main HTML file (required)
├── 404.html           # Custom 404 page (optional but recommended)
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js
│   ├── app.js
│   └── game.js
├── user_input_files/   # Your images
│   ├── $10chip.png
│   ├── $20chip.png
│   ├── $50chip.png
│   ├── $100chip.png
│   ├── $500chip.png
│   ├── $1000chip.png
│   ├── $10000chip.png
│   ├── tablebackground.png
│   └── cardsprites.png
└── README.md
```

---

## Troubleshooting

### Issue: Page shows 404 or blank screen

**Solution**: Check your file paths. GitHub Pages serves from the root, so paths should be:
- `css/style.css` (not `../css/style.css`)
- `js/app.js` (not `../js/app.js`)
- `user_input_files/chip.png` (not `../user_input_files/chip.png`)

### Issue: Images not loading

**Solution**: Ensure image paths in HTML/CSS are relative to the root:
- `user_input_files/$100chip.png` ✅
- `../user_input_files/$100chip.png` ❌

### Issue: JavaScript errors in console

**Solution**: 
1. Open browser Developer Tools (F12)
2. Check the Console tab for errors
3. Common issues:
   - Missing trailing commas in config
   - Invalid Firebase configuration
   - File path typos

### Issue: Firebase not working

**Solution**: 
1. Firebase only works with valid configuration
2. The game works in "demo mode" without Firebase
3. Check that you enabled Authentication and Firestore in Firebase Console

---

## Custom Domain (Optional)

To use a custom domain:

1. Go to your repository Settings > Pages
2. Under **Custom domain**, enter your domain
3. Click **Save**
4. Create appropriate DNS records:
   - For apex domain: A records pointing to GitHub IPs
   - For subdomain: CNAME record to `YOUR_USERNAME.github.io`

---

## Updating Your Site

After making changes:

```bash
# Add changed files
git add .

# Commit changes
git commit -m "Describe your changes"

# Push to GitHub
git push
```

Your site will automatically update in 1-2 minutes.

---

## Quick Reference

| Your Site URL | `https://YOUR_USERNAME.github.io/REPO_NAME/` |
|---------------|---------------------------------------------|
| Repository    | `https://github.com/YOUR_USERNAME/REPO_NAME/` |
| Settings      | `https://github.com/YOUR_USERNAME/REPO_NAME/settings/pages` |

---

## Need Help?

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Community Discussions](https://github.com/community)
- [Firebase Documentation](https://firebase.google.com/docs)
