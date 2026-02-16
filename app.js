// Memory Lane App - Main JavaScript

class MemoryLane {
    constructor() {
        this.memories = this.loadMemories();
        this.chatHistory = this.loadChatHistory();
        this.currentBrowseMessage = '';
        this.semanticFallbackActive = false;
        this.embedModel = 'claude-semantic-v1';
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
        document.getElementById('semantic-search-toggle').addEventListener('change', () => this.renderMemories());

        // Export/Import
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));

        // Chat conversation controls
        document.getElementById('new-chat-btn').addEventListener('click', () => this.startNewConversation());
        document.getElementById('gift-ideas-btn').addEventListener('click', () => this.toggleGiftPanel(true));
        document.getElementById('gift-cancel-btn').addEventListener('click', () => this.toggleGiftPanel(false));
        document.getElementById('gift-generate-btn').addEventListener('click', () => this.generateGiftIdeas());
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

    async addMemory() {
        const category = document.getElementById('category').value;
        const text = document.getElementById('memory-text').value;
        const tagsInput = document.getElementById('tags').value;
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];

        const memory = {
            id: Date.now(),
            category,
            text,
            tags,
            date: new Date().toISOString(),
            embedding: null,
            embeddingModel: null
        };

        // Best effort embed on creation; save even if embed fails.
        try {
            const [vector] = await this.fetchEmbeddings([this.buildMemoryEmbeddingText(memory)]);
            memory.embedding = vector;
            memory.embeddingModel = this.embedModel;
        } catch (error) {
            console.warn('Embedding failed during save, continuing without embedding:', error);
        }

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

    async renderMemories() {
        const container = document.getElementById('memories-list');
        const filterCategory = document.getElementById('filter-category').value;
        const searchTermRaw = document.getElementById('search-box').value.trim();
        const searchTerm = searchTermRaw.toLowerCase();
        const semanticOn = document.getElementById('semantic-search-toggle').checked;

        let filtered = [...this.memories];

        // Apply category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter(m => m.category === filterCategory);
        }

        let semanticScores = new Map();
        this.setBrowseMessage('');

        if (searchTermRaw && semanticOn) {
            try {
                await this.ensureEmbeddingsForMemories(filtered);
                const [queryVector] = await this.fetchEmbeddings([searchTermRaw]);

                semanticScores = new Map(filtered.map(memory => {
                    const score = this.cosineSimilarity(queryVector, memory.embedding || []);
                    return [memory.id, score];
                }));

                filtered.sort((a, b) => (semanticScores.get(b.id) || 0) - (semanticScores.get(a.id) || 0));
                this.semanticFallbackActive = false;
                this.setBrowseMessage('Showing semantic matches ranked by similarity.');
            } catch (error) {
                console.error('Semantic search failed, falling back to keyword search:', error);
                this.semanticFallbackActive = true;
                this.setBrowseMessage('Semantic search is temporarily unavailable. Showing keyword search instead.');
                this.showNotification('Semantic search unavailable right now, using keyword search.');
            }
        }

        // Keyword fallback/default behavior
        if (searchTermRaw && (!semanticOn || this.semanticFallbackActive)) {
            filtered = filtered.filter(m =>
                m.text.toLowerCase().includes(searchTerm) ||
                m.tags.some(t => t.toLowerCase().includes(searchTerm)) ||
                m.category.toLowerCase().includes(searchTerm)
            );
        }

        // Chronological list when search box is empty
        if (!searchTermRaw || (!semanticOn || this.semanticFallbackActive)) {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No memories found</h3>
                    <p>Start adding some memories!</p>
                </div>
            `;
            return;
        }

        const showMatchScore = searchTermRaw && semanticOn && !this.semanticFallbackActive;

        container.innerHTML = filtered.map(memory => `
            <div class="memory-card">
                <div class="memory-header">
                    <span class="memory-category">${this.formatCategory(memory.category)}</span>
                    <div>
                        <span class="memory-date">${this.formatDate(memory.date)}</span>
                        ${showMatchScore ? `<span class="match-score">Match: ${(semanticScores.get(memory.id) || 0).toFixed(2)}</span>` : ''}
                    </div>
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

    async ensureEmbeddingsForMemories(memories) {
        const missing = memories.filter(memory => !Array.isArray(memory.embedding) || memory.embedding.length === 0);

        if (!missing.length) {
            return;
        }

        for (let i = 0; i < missing.length; i += 20) {
            const batch = missing.slice(i, i + 20);
            const texts = batch.map(memory => this.buildMemoryEmbeddingText(memory));
            const vectors = await this.fetchEmbeddings(texts);

            batch.forEach((memory, idx) => {
                memory.embedding = vectors[idx] || null;
                memory.embeddingModel = this.embedModel;
            });
        }

        this.saveMemories();
    }

    buildMemoryEmbeddingText(memory) {
        const tags = Array.isArray(memory.tags) ? memory.tags.join(', ') : '';
        return `${memory.category || ''} | ${tags} | ${memory.text || ''}`;
    }

    async fetchEmbeddings(inputs) {
        const response = await fetch('/api/embed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch embeddings');
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.vectors)) {
            throw new Error('Invalid embeddings response');
        }

        if (typeof data.model === 'string') {
            this.embedModel = data.model;
        }

        return data.vectors;
    }

    cosineSimilarity(vectorA, vectorB) {
        if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || !vectorA.length || !vectorB.length || vectorA.length !== vectorB.length) {
            return 0;
        }

        let dot = 0;
        let magA = 0;
        let magB = 0;

        for (let i = 0; i < vectorA.length; i += 1) {
            dot += vectorA[i] * vectorB[i];
            magA += vectorA[i] * vectorA[i];
            magB += vectorB[i] * vectorB[i];
        }

        const denominator = Math.sqrt(magA) * Math.sqrt(magB);
        if (!denominator) {
            return 0;
        }

        return dot / denominator;
    }

    setBrowseMessage(message) {
        this.currentBrowseMessage = message;
        const browseMessage = document.getElementById('browse-message');
        browseMessage.textContent = message;
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
            const response = await fetch('/api/chat', {
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

    toggleGiftPanel(show) {
        const panel = document.getElementById('gift-ideas-panel');
        panel.hidden = !show;
    }

    selectMemoriesForGiftIdeas(limit = 80) {
        const priorityCategories = new Set(['gifts', 'favorites', 'activities']);
        const scored = this.memories
            .map(memory => {
                const created = new Date(memory.date).getTime() || 0;
                const categoryScore = priorityCategories.has(memory.category) ? 1 : 0;
                return {
                    memory,
                    categoryScore,
                    created
                };
            })
            .sort((a, b) => {
                if (b.categoryScore !== a.categoryScore) {
                    return b.categoryScore - a.categoryScore;
                }
                return b.created - a.created;
            })
            .slice(0, limit)
            .map(({ memory }) => ({
                id: memory.id,
                category: memory.category,
                text: memory.text,
                tags: memory.tags,
                createdAt: memory.date
            }));

        return scored;
    }

    async generateGiftIdeas() {
        const occasion = document.getElementById('gift-occasion').value;
        const budget = document.getElementById('gift-budget').value.trim() || 'flexible';
        const timeframe = document.getElementById('gift-timeframe').value.trim() || 'no strict deadline';

        const question = `Suggest gift ideas for ${occasion}, budget ${budget}, timeframe ${timeframe}.`;
        const memories = this.selectMemoriesForGiftIdeas();

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant loading';
        loadingDiv.textContent = 'Generating gift ideas';
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(loadingDiv);

        try {
            const response = await fetch('/api/gift-ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, memories })
            });

            loadingDiv.remove();

            if (!response.ok) {
                throw new Error('Gift ideas endpoint failed');
            }

            const data = await response.json();
            this.renderGiftIdeasInChat(data);
            this.toggleGiftPanel(false);
        } catch (error) {
            loadingDiv.remove();
            this.addChatMessage('I couldn\'t generate gift ideas right now. Please try again in a moment.', 'system');
            console.error('Gift ideas error:', error);
        }
    }

    renderGiftIdeasInChat(data) {
        const ideas = Array.isArray(data.ideas) ? data.ideas : [];
        const followUps = Array.isArray(data.followUps) ? data.followUps : [];

        const wrapper = document.createElement('div');
        wrapper.className = 'message assistant';

        const ideasHtml = ideas.map(idea => `
            <div class="gift-idea-card">
                <strong>${idea.title || 'Idea'}</strong>
                <div>${idea.why || ''}</div>
                <div class="gift-idea-meta">Price Range: ${idea.priceRange || 'N/A'} · Effort: ${idea.effort || 'N/A'}</div>
                <div><em>Related Memories:</em> ${(idea.relatedMemories || []).join(', ') || 'N/A'}</div>
            </div>
        `).join('');

        const followUpsHtml = followUps.length
            ? `<div><strong>Follow-up questions:</strong><ul class="gift-followups">${followUps.map(item => `<li>${item}</li>`).join('')}</ul></div>`
            : '';

        wrapper.innerHTML = `
            <div><strong>Gift ideas based on your saved memories:</strong></div>
            <div class="gift-ideas-wrap">${ideasHtml}</div>
            ${followUpsHtml}
        `;

        document.getElementById('chat-messages').appendChild(wrapper);
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
            gifts: '🎁 Gifts',
            travel: '✈️ Travel',
            food: '🍽️ Food',
            activities: '🎨 Activities',
            favorites: '⭐ Favorites',
            memories: '💭 Memories',
            other: '📝 Other'
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
                        this.memories = imported.map(memory => ({
                            ...memory,
                            embedding: Array.isArray(memory.embedding) ? memory.embedding : null,
                            embeddingModel: memory.embeddingModel || null
                        }));
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
        const parsed = stored ? JSON.parse(stored) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(memory => ({
            ...memory,
            embedding: Array.isArray(memory.embedding) ? memory.embedding : null,
            embeddingModel: memory.embeddingModel || null
        }));
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
