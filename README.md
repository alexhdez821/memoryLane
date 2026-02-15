# 💝 Memory Lane

A personal relationship database with AI-powered chat interface. Keep track of the little things your fiancée mentions - gift ideas, travel wishes, favorite things - and chat with an AI that has access to all those memories.

## Features

- **Add Memories**: Store things she mentions across different categories (gifts, travel, food, activities, favorites, etc.)
- **Smart Organization**: Filter by category, search across all memories, and tag entries for easy retrieval
- **AI Chat Interface**: Ask questions like "What would be a good birthday gift?" and get personalized suggestions based on your stored memories
- **Export/Import**: Backup your data or share between devices
- **Beautiful UI**: Clean, modern interface with gradient theme

## Quick Start

### 1. Local Development

```bash
# Install dependencies
npm install

# Create .env file with your Anthropic API key
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env

# Start local development server
netlify dev
```

Visit `http://localhost:8888` in your browser.

### 2. Deploy to Netlify

#### Option A: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally if you haven't
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

#### Option B: Deploy via GitHub + Netlify Dashboard

1. Push this code to a GitHub repository
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Netlify will auto-detect the settings from `netlify.toml`
6. Add environment variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key from https://console.anthropic.com
7. Click "Deploy site"

## Setting Up Your API Key

1. Get your API key from [Anthropic Console](https://console.anthropic.com)
2. In Netlify Dashboard:
   - Go to Site settings → Environment variables
   - Add `ANTHROPIC_API_KEY` with your key
3. For local development:
   - Create a `.env` file in the project root
   - Add: `ANTHROPIC_API_KEY=your_key_here`

## Usage

### Adding Memories

1. Click "Add Memory" tab
2. Select a category (Gifts, Travel, Food, etc.)
3. Write what she said (e.g., "She mentioned loving handmade pottery")
4. Optionally add tags (e.g., "birthday, hobby")
5. Click "Save Memory"

### Browsing Memories

1. Click "Browse" tab
2. Use the category filter or search box to find specific memories
3. Delete memories you no longer need

### Chatting with AI

1. Click "Ask AI" tab
2. Type questions like:
   - "What would be a good anniversary gift?"
   - "Where does she want to travel?"
   - "What are her favorite restaurants?"
   - "Suggest a date idea based on her interests"
3. The AI will reference your stored memories to give personalized suggestions

### Export/Import

- **Export**: Downloads a JSON file backup of all your memories
- **Import**: Upload a previously exported JSON file to restore data

## Data Storage

- Data is stored locally in your browser's localStorage
- Use Export to create backups
- Data stays private - only you can access it
- The AI chat sends your memories to Anthropic's API temporarily for each query (not stored by Anthropic)

## Customization Ideas

Want to enhance the app? Here are some ideas:

1. **Add Photos**: Store images along with memories
2. **Reminders**: Set reminders for birthdays/anniversaries
3. **Cloud Sync**: Add Firebase or Supabase for cross-device sync
4. **More Categories**: Add custom categories beyond the default ones
5. **Timeline View**: Visualize memories on a timeline
6. **Sharing**: Generate shareable gift lists or trip ideas

## Tech Stack

- Pure HTML/CSS/JavaScript (no framework needed!)
- Anthropic Claude API for AI chat
- Netlify Functions for serverless API calls
- localStorage for data persistence

## Privacy & Security

- All data is stored locally in your browser
- API key is stored securely as environment variable (never in code)
- Memories are only sent to Claude API when you use the chat feature
- No tracking, no analytics, no third-party services

## Contributing

This is a personal project, but feel free to fork and customize for your own use!

## License

MIT License - feel free to use and modify as you wish.

---

Made with 💝 for keeping track of the little things that matter.
