# 🚀 Quick Start Guide

## Fastest Way to Get Started (5 minutes)

### Step 1: Get Your API Key
1. Go to https://console.anthropic.com
2. Sign in or create an account
3. Go to "API Keys" section
4. Create a new key and copy it

### Step 2: Deploy to Netlify

#### Option A: Deploy from this folder (recommended)
```bash
cd memory-lane

# Install dependencies
npm install

# Install Netlify CLI if you don't have it
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod

# When prompted:
# - Create a new site
# - Leave build command empty (just press Enter)
# - Set publish directory to: .
```

After deployment:
1. Go to your Netlify dashboard
2. Click on your new site
3. Go to Site settings → Environment variables
4. Add variable: `ANTHROPIC_API_KEY` = your API key
5. Done! Visit your site URL

#### Option B: Deploy via GitHub
1. Create a new GitHub repository
2. Push this folder to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```
3. Go to https://app.netlify.com
4. Click "Add new site" → "Import an existing project"
5. Choose your GitHub repo
6. Add environment variable: `ANTHROPIC_API_KEY` = your key
7. Click "Deploy site"

### Step 3: Start Using It!
1. Visit your deployed site
2. Click "Add Memory" tab
3. Start recording things your fiancée mentions
4. Use "Ask AI" to get personalized suggestions

## Testing Locally First

```bash
# Create .env file
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Install and run
npm install
netlify dev

# Visit http://localhost:8888
```

## Example Memories to Add

**Gifts Category:**
- "She mentioned wanting to learn pottery"
- "She loves handmade jewelry, especially with turquoise"
- "Saw her looking at those Ember temperature control mugs"

**Travel Category:**
- "Always wanted to visit Japan in cherry blossom season"
- "Dreams of road trip through Iceland"

**Food Category:**
- "Her favorite restaurant is that Thai place on 5th"
- "Allergic to peanuts"
- "Loves trying new coffee shops"

**Activities:**
- "Wants to take salsa dancing classes"
- "Interested in learning watercolor painting"

## Example AI Queries

Once you have memories added, try asking:
- "What would be a good birthday gift?"
- "Suggest a date idea for this weekend"
- "Where should we travel for our anniversary?"
- "What kind of coffee would she like?"
- "Help me plan a surprise based on her interests"

## Tips

- Add memories as soon as she mentions something - don't wait!
- Use tags to group related items (e.g., "birthday", "christmas")
- Export your data regularly as backup
- The more memories you add, the better the AI suggestions

## Troubleshooting

**Chat not working?**
- Check that your API key is set correctly in Netlify
- Make sure you deployed the serverless function
- Check browser console for errors

**Lost your data?**
- Data is in browser localStorage - clear cache will delete it
- Use Export feature regularly to backup
- Consider upgrading to cloud storage later

---

Need help? The README.md has more detailed instructions!
