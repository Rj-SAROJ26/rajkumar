/**
 * Chat History Manager - Vanilla JS
 * Manages chat sessions and messages using localStorage
 */

const STORAGE_KEY = 'skinChatHistories';
const CURRENT_CHAT_KEY = 'skinCurrentChat';

// Dummy AI responses (for demo - replace with real API calls)
const dummyResponses = [
    "Eczema is a common skin condition characterized by inflamed, itchy, and dry skin. Consider moisturizing regularly and avoiding harsh soaps.",
    "Psoriasis is an autoimmune condition that causes rapid cell turnover. It's important to consult a dermatologist for proper treatment options.",
    "Acne forms when pores get clogged with bacteria and dead skin cells. A consistent skincare routine can help manage breakouts.",
    "Dermatitis refers to skin inflammation. Keep affected areas clean and use hypoallergenic products.",
    "Melanoma is a serious form of skin cancer. Always apply sunscreen and monitor skin changes regularly."
];

/**
 * Get all chat histories from localStorage
 */
function loadAllChats() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

/**
 * Save all chats to localStorage
 */
function saveAllChats(chats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

/**
 * Load current chat session
 */
function loadCurrentChat() {
    const id = localStorage.getItem(CURRENT_CHAT_KEY);
    if (!id) return null;
    
    const chats = loadAllChats();
    return chats.find(chat => chat.id === id) || null;
}

/**
 * Create a new chat session
 */
function createNewChat() {
    const id = Date.now().toString();
    const newChat = {
        id,
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        messages: []
    };
    
    const chats = loadAllChats();
    chats.unshift(newChat);
    saveAllChats(chats);
    
    localStorage.setItem(CURRENT_CHAT_KEY, id);
    
    return newChat;
}

/**
 * Get or create current chat
 */
function getCurrentOrCreateChat() {
    let current = loadCurrentChat();
    if (!current) {
        current = createNewChat();
    }
    return current;
}

/**
 * Add message to current chat
 */
function addMessageToChat(role, content) {
    const chatId = localStorage.getItem(CURRENT_CHAT_KEY);
    if (!chatId) return;
    
    const chats = loadAllChats();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return;
    
    const message = {
        id: Date.now().toString(),
        role, // 'user' or 'ai'
        content,
        timestamp: new Date().toISOString()
    };
    
    chats[chatIndex].messages.push(message);
    
    // Update title from first user message
    if (role === 'user' && chats[chatIndex].messages.length === 1) {
        chats[chatIndex].title = content.substring(0, 40) + (content.length > 40 ? '...' : '');
    }
    
    saveAllChats(chats);
    return message;
}

/**
 * Delete a chat
 */
function deleteChat(chatId) {
    let chats = loadAllChats();
    chats = chats.filter(c => c.id !== chatId);
    saveAllChats(chats);
    
    if (localStorage.getItem(CURRENT_CHAT_KEY) === chatId) {
        localStorage.removeItem(CURRENT_CHAT_KEY);
    }
}

/**
 * Clear all chats (with confirmation)
 */
function clearAllChats() {
    if (confirm('Delete all chat history? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CURRENT_CHAT_KEY);
        return true;
    }
    return false;
}

/**
 * Render chat messages
 */
function renderMessages() {
    const container = document.getElementById('messageContainer');
    const chat = getCurrentOrCreateChat();
    
    if (!chat || chat.messages.length === 0) {
        container.innerHTML = `
            <div class="no-chat">
                <h3>No messages yet</h3>
                <p>Start a conversation about skin health!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    chat.messages.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${msg.role}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        msgDiv.innerHTML = `
            <div>
                <div class="message-bubble">${escapeHtml(msg.content)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        container.appendChild(msgDiv);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

/**
 * Render chat history list
 */
function renderHistoryList() {
    const list = document.getElementById('historyList');
    const chats = loadAllChats();
    const currentId = localStorage.getItem(CURRENT_CHAT_KEY);
    
    if (chats.length === 0) {
        list.innerHTML = '<p style="padding: 1rem; color: #999;">No chats yet</p>';
        return;
    }
    
    list.innerHTML = '';
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === currentId ? 'active' : ''}`;
        
        const date = new Date(chat.createdAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        item.innerHTML = `
            <div class="history-item-title">${escapeHtml(chat.title)}</div>
            <div class="history-item-date">${date}</div>
            <button class="history-item-delete">Delete</button>
        `;
        
        item.querySelector('.history-item-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this chat?')) {
                deleteChat(chat.id);
                if (chat.id === currentId) {
                    const newChat = createNewChat();
                    localStorage.setItem(CURRENT_CHAT_KEY, newChat.id);
                }
                renderHistoryList();
                renderMessages();
                updateChatHeader();
            }
        });
        
        item.addEventListener('click', () => {
            localStorage.setItem(CURRENT_CHAT_KEY, chat.id);
            renderHistoryList();
            renderMessages();
            updateChatHeader();
        });
        
        list.appendChild(item);
    });
}

/**
 * Update chat header with current chat title and date
 */
function updateChatHeader() {
    const chat = getCurrentOrCreateChat();
    document.getElementById('chatTitle').textContent = escapeHtml(chat.title) || 'SkinNet AI Assistant';
    
    const date = new Date(chat.createdAt).toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('chatDate').textContent = date;
}

/**
 * Send message (user input -> AI response)
 */
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addMessageToChat('user', message);
    renderMessages();
    input.value = '';
    
    // Simulate AI response (replace with real API call)
    const response = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
    setTimeout(() => {
        addMessageToChat('ai', response);
        renderMessages();
    }, 500);
    
    // Update history list (in case title was updated)
    renderHistoryList();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialize
 */
function init() {
    // Ensure current chat exists
    getCurrentOrCreateChat();
    
    // Render UI
    renderHistoryList();
    renderMessages();
    updateChatHeader();
    
    // Event listeners
    document.getElementById('newChatBtn').addEventListener('click', () => {
        const newChat = createNewChat();
        localStorage.setItem(CURRENT_CHAT_KEY, newChat.id);
        renderHistoryList();
        renderMessages();
        updateChatHeader();
        document.getElementById('messageInput').focus();
    });
    
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.getElementById('clearAllBtn').addEventListener('click', () => {
        if (clearAllChats()) {
            const newChat = createNewChat();
            localStorage.setItem(CURRENT_CHAT_KEY, newChat.id);
            renderHistoryList();
            renderMessages();
            updateChatHeader();
        }
    });
    
    document.getElementById('messageInput').focus();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
