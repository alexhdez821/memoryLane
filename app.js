// Memory Lane App - Main JavaScript

class MemoryLane {
    constructor() {
        this.memories = this.loadMemories();
        this.chatHistory = this.loadChatHistory();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderMemories();
        this.renderChatHistory();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Memory form submission
        document.getElementById('memory-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMemory();
        });

        // Chat form submission
        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendChatMessage();
        });

        // Filter and search
        document.getElementById('filter-category').addEventListener('change', () => this.renderMemories());
        document.getElementById('search-box').addEventListener('input', () => this.renderMemories());

        // Export/Import
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));

        // Chat conversation controls
        document.getElementById('new-chat-btn').addEventListener('click', () => this.startNewConversation());
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Refresh memories list if switching to browse tab
        if (tabName === 'browse') {
            this.renderMemories();
        }
    }

    addMemory() {
        const category = document.getElementById('category').value;
        const text = document.getElementById('memory-text').value;
        const tagsInput = document.getElementById('tags').value;
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

        const memory = {
            id: Date.now(),
            category,
            text,
            tags,
            date: new Date().toISOString()
        };

        this.memories.push(memory);
        this.saveMemories();
        
        // Clear form
        document.getElementById('memory-form').reset();
        
        // Show success message
        this.showNotification('Memory saved! 💝');
        
        // Switch to browse tab
        this.switchTab('browse');
    }

    deleteMemory(id) {
        if (confirm('Are you sure you want to delete this memory?')) {
            this.memories = this.memories.filter(m => m.id !== id);
            this.saveMemories();
            this.renderMemories();
            this.showNotification('Memory deleted');
        }
    }

    renderMemories() {
        const container = document.getElementById('memories-list');
        const filterCategory = document.getElementById('filter-category').value;
        const searchTerm = document.getElementById('search-box').value.toLowerCase();

        let filtered = this.memories;

        // Apply category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter(m => m.category === filterCategory);
        }

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(m => 
                m.text.toLowerCase().includes(searchTerm) ||
                m.tags.some(t => t.toLowerCase().includes(searchTerm))
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No memories found</h3>
                    <p>Start adding some memories!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(memory => `
            <div class="memory-card">
                <div class="memory-header">
                    <span class="memory-category">${this.formatCategory(memory.category)}</span>
                    <span class="memory-date">${this.formatDate(memory.date)}</span>
                </div>
                <div class="memory-text">${memory.text}</div>
                ${memory.tags.length > 0 ? `
                    <div class="memory-tags">
                        ${memory.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <button class="delete-btn" onclick="app.deleteMemory(${memory.id})">Delete</button>
            </div>
        `).join('');
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message) return;

        // Add user message to chat and persist it
        this.addChatMessage(message, 'user');
        this.chatHistory.push({ role: 'user', content: message });
        this.saveChatHistory();
        input.value = '';

        // Show loading
        const chatMessages = document.getElementById('chat-messages');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant loading';
        loadingDiv.textContent = 'Thinking';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // Call Claude API through serverless function
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    memories: this.memories,
                    chatHistory: this.chatHistory.slice(0, -1)
                })
            });

            // Remove loading message
            loadingDiv.remove();

            if (!response.ok) {
                throw new Error('Failed to get response from AI');
            }

            const data = await response.json();
            const assistantReply = data.response || 'I could not generate a response.';
            this.addChatMessage(assistantReply, 'assistant');
            this.chatHistory.push({ role: 'assistant', content: assistantReply });
            this.saveChatHistory();

        } catch (error) {
            loadingDiv.remove();
            const errorMessage = "Sorry, I encountered an error. Please make sure you've set up the Netlify function with your API key.";
            this.addChatMessage(errorMessage, 'system');
            this.chatHistory.push({ role: 'system', content: errorMessage });
            this.saveChatHistory();
            console.error('Chat error:', error);
        }
    }

    addChatMessage(text, type) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    renderChatHistory() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';

        this.chatHistory.forEach(message => {
            this.addChatMessage(message.content, message.role);
        });
    }

    startNewConversation() {
        if (!this.chatHistory.length) {
            this.showNotification('You are already in a fresh conversation ✨');
            return;
        }

        if (confirm('Start a new conversation? This clears the current Ask AI chat history.')) {
            this.chatHistory = [];
            this.saveChatHistory();
            this.renderChatHistory();
            this.showNotification('Started a new conversation ✨');
        }
    }

    formatCategory(category) {
        const categories = {
            'gifts': '🎁 Gifts',
            'travel': '✈️ Travel',
            'food': '🍽️ Food',
            'activities': '🎨 Activities',
            'favorites': '⭐ Favorites',
            'memories': '💭 Memories',
            'other': '📝 Other'
        };
        return categories[category] || category;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    showNotification(message) {
        // Simple notification - you could make this fancier
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    exportData() {
        const dataStr = JSON.stringify(this.memories, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `memory-lane-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Data exported! 📥');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    if (confirm(`This will import ${imported.length} memories. Continue?`)) {
                        this.memories = imported;
                        this.saveMemories();
                        this.renderMemories();
                        this.showNotification('Data imported successfully! 📤');
                    }
                } else {
                    alert('Invalid file format');
                }
            } catch (error) {
                alert('Error reading file');
                console.error(error);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }

    loadMemories() {
        const stored = localStorage.getItem('memoryLaneData');
        return stored ? JSON.parse(stored) : [];
    }

    loadChatHistory() {
        const stored = localStorage.getItem('memoryLaneChatHistory');
        const parsed = stored ? JSON.parse(stored) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(entry => (
            entry &&
            ['user', 'assistant', 'system'].includes(entry.role) &&
            typeof entry.content === 'string'
        ));
    }

    saveMemories() {
        localStorage.setItem('memoryLaneData', JSON.stringify(this.memories));
    }

    saveChatHistory() {
        localStorage.setItem('memoryLaneChatHistory', JSON.stringify(this.chatHistory));
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize app
const app = new MemoryLane();
