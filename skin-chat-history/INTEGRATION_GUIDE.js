/**
 * Chat History Integration Guide
 * 
 * This file demonstrates how to integrate localStorage-based chat history
 * with the FastAPI backend endpoints.
 * 
 * Two approaches:
 * 1. Pure localStorage (default) - works offline
 * 2. With backend sync - persistent server storage
 */

// ==================== APPROACH 1: Pure localStorage ====================
// Current implementation in skin-chat-history/script.js
// No backend required, works entirely in browser

// Advantages:
// - Works offline
// - No server dependency
// - Fast (no network latency)
// - Privacy (data stays on device)

// Disadvantages:
// - Browser storage limit (~5-10MB)
// - Single device only
// - Data lost if browser cleared

// ==================== APPROACH 2: Backend Sync ====================
// Optional enhancement for multi-device sync

class ChatHistoryManager {
    constructor(apiBase = '/api') {
        this.apiBase = apiBase;
    }

    /**
     * Create new chat on server
     */
    async createChat(title) {
        const response = await fetch(`${this.apiBase}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        
        if (!response.ok) throw new Error('Failed to create chat');
        return await response.json();
    }

    /**
     * Get all chats from server
     */
    async getAllChats() {
        const response = await fetch(`${this.apiBase}/chat?limit=100`);
        if (!response.ok) throw new Error('Failed to fetch chats');
        return await response.json();
    }

    /**
     * Get specific chat with all messages
     */
    async getChat(chatId) {
        const response = await fetch(`${this.apiBase}/chat/${chatId}`);
        if (!response.ok) throw new Error('Chat not found');
        return await response.json();
    }

    /**
     * Add message to chat
     */
    async addMessage(chatId, role, content) {
        const response = await fetch(`${this.apiBase}/chat/${chatId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, content })
        });
        
        if (!response.ok) throw new Error('Failed to add message');
        return await response.json();
    }

    /**
     * Get messages from chat
     */
    async getMessages(chatId, limit = 100) {
        const response = await fetch(`${this.apiBase}/chat/${chatId}/message?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        return await response.json();
    }

    /**
     * Search chats by keyword
     */
    async searchChats(keyword) {
        const response = await fetch(`${this.apiBase}/chat/search/keyword?keyword=${encodeURIComponent(keyword)}`);
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    }

    /**
     * Delete chat
     */
    async deleteChat(chatId) {
        const response = await fetch(`${this.apiBase}/chat/${chatId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete chat');
        return await response.json();
    }

    /**
     * Delete message
     */
    async deleteMessage(chatId, messageId) {
        const response = await fetch(`${this.apiBase}/chat/${chatId}/message/${messageId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete message');
        return await response.json();
    }

    /**
     * Get chat statistics
     */
    async getStats() {
        const response = await fetch(`${this.apiBase}/chat/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    }

    /**
     * Export chat
     */
    async exportChat(chatId) {
        const response = await fetch(`${this.apiBase}/chat/${chatId}/export`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Export failed');
        return await response.json();
    }
}

// ==================== HYBRID APPROACH ====================
// localStorage for offline support + backend for sync

class HybridChatManager {
    constructor(apiBase = '/api') {
        this.manager = new ChatHistoryManager(apiBase);
        this.storageKey = 'skinChatHistories';
        this.offlineMode = false;
    }

    /**
     * Try server, fallback to localStorage
     */
    async createChat(title) {
        try {
            return await this.manager.createChat(title);
        } catch (error) {
            console.warn('Server unavailable, using localStorage', error);
            this.offlineMode = true;
            return this._createChatLocal(title);
        }
    }

    /**
     * Try server, fallback to localStorage
     */
    async addMessage(chatId, role, content) {
        try {
            return await this.manager.addMessage(chatId, role, content);
        } catch (error) {
            console.warn('Server unavailable, using localStorage', error);
            this.offlineMode = true;
            return this._addMessageLocal(chatId, role, content);
        }
    }

    /**
     * Sync local data to server when connection restored
     */
    async syncToServer() {
        if (!this.offlineMode) return;

        console.log('Syncing offline data to server...');
        const localChats = this._getLocalChats();

        for (const chat of localChats) {
            try {
                const serverChat = await this.manager.createChat(chat.title);
                
                for (const msg of chat.messages) {
                    await this.manager.addMessage(serverChat.id, msg.role, msg.content);
                }
                
                console.log(`Synced chat: ${chat.id}`);
            } catch (error) {
                console.error(`Failed to sync chat ${chat.id}:`, error);
            }
        }

        this.offlineMode = false;
        console.log('Sync complete');
    }

    // Local methods
    _getLocalChats() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    _createChatLocal(title) {
        const chats = this._getLocalChats();
        const chat = {
            id: `local_${Date.now()}`,
            title,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
            _local: true
        };
        chats.unshift(chat);
        localStorage.setItem(this.storageKey, JSON.stringify(chats));
        return chat;
    }

    _addMessageLocal(chatId, role, content) {
        const chats = this._getLocalChats();
        const chat = chats.find(c => c.id === chatId);
        if (!chat) throw new Error('Chat not found');

        const message = {
            id: `msg_${Date.now()}`,
            role,
            content,
            timestamp: new Date().toISOString()
        };

        chat.messages.push(message);
        chat.updatedAt = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(chats));
        return message;
    }
}

// ==================== USAGE EXAMPLES ====================

/**
 * Example 1: Using Backend Manager
 */
async function example1_BackendOnly() {
    const chat = new ChatHistoryManager('/api');

    // Create chat
    const newChat = await chat.createChat('Skin Health Discussion');
    console.log('Created chat:', newChat.id);

    // Add messages
    await chat.addMessage(newChat.id, 'user', 'What is eczema?');
    const response = await chat.addMessage(newChat.id, 'ai', 'Eczema is a skin condition...');

    // Get all messages
    const messages = await chat.getMessages(newChat.id);
    console.log('Messages:', messages);

    // Search
    const results = await chat.searchChats('eczema');
    console.log('Search results:', results);

    // Stats
    const stats = await chat.getStats();
    console.log('Stats:', stats);
}

/**
 * Example 2: Using Hybrid Manager (offline + online)
 */
async function example2_Hybrid() {
    const chat = new HybridChatManager('/api');

    // Works online or offline
    const newChat = await chat.createChat('Skin Health');
    await chat.addMessage(newChat.id, 'user', 'What causes acne?');

    // Later, when connection restored:
    await chat.syncToServer();
}

/**
 * Example 3: Integrating with React Component
 */
class ChatComponent {
    constructor(apiBase = '/api') {
        this.manager = new ChatHistoryManager(apiBase);
        this.currentChat = null;
    }

    async loadChat(chatId) {
        this.currentChat = await this.manager.getChat(chatId);
        this.renderMessages();
    }

    async sendMessage(content) {
        if (!this.currentChat) return;

        // Add user message
        await this.manager.addMessage(this.currentChat.id, 'user', content);

        // Get AI response (from your AI endpoint)
        const aiResponse = await this.getAIResponse(content);

        // Add AI message
        await this.manager.addMessage(this.currentChat.id, 'ai', aiResponse);

        // Reload chat to show new messages
        await this.loadChat(this.currentChat.id);
    }

    async getAIResponse(userMessage) {
        // Call your chatbot endpoint
        const response = await fetch('/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });
        const data = await response.json();
        return data.response;
    }

    renderMessages() {
        // Update UI with messages
        this.currentChat.messages.forEach(msg => {
            console.log(`[${msg.role}] ${msg.content}`);
        });
    }
}

// ==================== INTEGRATION CHECKLIST ====================

/**
 * To integrate backend into skin-chat-history/script.js:
 * 
 * 1. Add ChatHistoryManager class (or import from separate file)
 * 2. Replace localStorage calls with manager methods:
 *    - loadAllChats() → manager.getAllChats()
 *    - saveCurrentChat() → manager.addMessage()
 *    - deleteChat() → manager.deleteChat()
 * 3. Add error handling for network failures
 * 4. Add sync functionality for offline support
 * 5. Update UI to show sync status
 * 6. Test thoroughly with backend running
 * 
 * 7. Environment setup:
 *    - Ensure FastAPI server running: uvicorn main:app --reload
 *    - Verify CORS enabled in main.py
 *    - Check browser console for errors
 *    - Monitor backend logs
 * 
 * 8. Authentication (future):
 *    - Add token to fetch headers: Authorization: Bearer {token}
 *    - Implement user_id scoping in backend
 *    - Secure chat access with ownership checks
 */

// ==================== EXPORT ====================
// For module usage:
// export { ChatHistoryManager, HybridChatManager, ChatComponent };
