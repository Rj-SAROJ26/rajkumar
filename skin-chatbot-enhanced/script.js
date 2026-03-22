/**
 * Enhanced Chatbot Manager
 * Advanced ChatGPT-like interface with conversation memory, dark mode, search, and more
 */

const API_BASE = 'http://localhost:8000/api';
const STORAGE_KEY = 'skinChatSession';
const DARK_MODE_KEY = 'chatbotDarkMode';

class ChatbotManager {
    constructor(apiBase = API_BASE) {
        this.apiBase = apiBase;
        this.conversationHistory = [];
        this.sessionId = this.generateSessionId();
        this.isLoading = false;
        this.messageCount = 0;
        this.maxMessages = 50;
        this.darkMode = false;
        this.searchQuery = '';
        this.filteredMessages = [];
        
        this.initializeUI();
        this.loadSession();
        this.loadDarkMode();
        this.setupKeyboardShortcuts();
    }

    /**
     * Initialize DOM elements and event listeners
     */
    initializeUI() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.darkModeBtn = document.getElementById('darkModeBtn');
        this.searchBtn = document.getElementById('searchBtn');
        this.searchInput = document.getElementById('searchInput');
        this.exportBtn = document.getElementById('exportBtn');

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.clearBtn.addEventListener('click', () => this.clearConversation());
        
        // Dark mode button
        if (this.darkModeBtn) {
            this.darkModeBtn.addEventListener('click', () => this.toggleDarkMode());
        }
        
        // Search functionality
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.toggleSearch());
        }
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.searchMessages(e.target.value));
        }
        
        // Export button
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.downloadConversation());
        }

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.messageInput.value = btn.textContent;
                this.messageInput.focus();
            });
        });
    }

    /**
     * Auto-resize textarea based on content
     */
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(
            this.messageInput.scrollHeight,
            120
        ) + 'px';
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Load previous session from localStorage
     */
    loadSession() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.conversationHistory = data.messages || [];
                this.sessionId = data.sessionId || this.sessionId;
                
                if (this.conversationHistory.length > 0) {
                    this.renderConversation();
                    this.autoScrollToBottom();
                }
            } catch (error) {
                console.error('Failed to load session:', error);
            }
        }
    }

    /**
     * Save session to localStorage
     */
    saveSession() {
        const data = {
            sessionId: this.sessionId,
            messages: this.conversationHistory,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    /**
     * Send message to chatbot
     */
    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || this.isLoading) return;

        // Add user message
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.saveSession();

        // Show typing indicator
        this.showTypingIndicator();
        this.isLoading = true;
        this.sendBtn.disabled = true;

        try {
            // Call backend API
            const response = await fetch(`${this.apiBase}/chatbot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId,
                    conversation_history: this.conversationHistory.slice(-10) // Last 10 messages for context
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.response || 'Unable to generate response';

            // Remove typing indicator
            this.removeTypingIndicator();

            // Add AI message
            this.addMessage('ai', aiResponse);
            this.saveSession();

        } catch (error) {
            console.error('Error:', error);
            this.removeTypingIndicator();
            this.addMessage('ai', `⚠️ Error: ${error.message}. Please try again.`, 'error');
        } finally {
            this.isLoading = false;
            this.sendBtn.disabled = false;
            this.messageInput.focus();
        }
    }

    /**
     * Add message to conversation
     */
    addMessage(role, content, type = 'normal') {
        this.messageCount++;

        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            role,
            content,
            timestamp: new Date().toISOString(),
            type
        };

        this.conversationHistory.push(message);

        // Limit conversation history
        if (this.conversationHistory.length > this.maxMessages) {
            this.conversationHistory.shift();
        }

        this.renderMessage(message);
        this.autoScrollToBottom();

        return message;
    }

    /**
     * Render single message with enhanced features
     */
    renderMessage(message, highlightQuery = '') {
        // Remove welcome message if not already removed
        const welcome = this.messagesContainer.querySelector('.message-welcome');
        if (welcome) welcome.remove();

        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.role}`;
        if (message.type === 'error') messageEl.classList.add('error');
        if (message.type === 'success') messageEl.classList.add('success');
        messageEl.dataset.messageId = message.id;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = message.role === 'user' ? '👤' : '🤖';

        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.style.display = 'flex';
        bubbleWrapper.style.flexDirection = 'column';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.innerHTML = this.formatMessage(message.content, highlightQuery);

        const footerActions = document.createElement('div');
        footerActions.className = 'message-footer';
        
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        footerActions.appendChild(time);

        // Add action buttons for AI messages
        if (message.role === 'ai') {
            const actions = document.createElement('div');
            actions.className = 'message-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn';
            copyBtn.title = 'Copy message';
            copyBtn.textContent = '📋';
            copyBtn.addEventListener('click', () => this.copyMessageToClipboard(message.id));

            const thumbsUp = document.createElement('button');
            thumbsUp.className = 'action-btn';
            thumbsUp.title = 'Helpful';
            thumbsUp.textContent = '👍';
            thumbsUp.addEventListener('click', () => {
                this.giveFeedback(message.id, 'helpful');
                thumbsUp.style.opacity = '0.5';
                thumbsUp.disabled = true;
            });

            const thumbsDown = document.createElement('button');
            thumbsDown.className = 'action-btn';
            thumbsDown.title = 'Not helpful';
            thumbsDown.textContent = '👎';
            thumbsDown.addEventListener('click', () => {
                this.giveFeedback(message.id, 'not_helpful');
                thumbsDown.style.opacity = '0.5';
                thumbsDown.disabled = true;
            });

            actions.appendChild(copyBtn);
            actions.appendChild(thumbsUp);
            actions.appendChild(thumbsDown);
            footerActions.appendChild(actions);
        }

        bubbleWrapper.appendChild(bubble);
        bubbleWrapper.appendChild(footerActions);

        messageEl.appendChild(avatar);
        messageEl.appendChild(bubbleWrapper);

        this.messagesContainer.appendChild(messageEl);
    }

    /**
     * Format message content (markdown-like)
     */
    formatMessage(content) {
        let formatted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Bold text
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic text
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Lists
        formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        // Paragraphs
        const paragraphs = formatted.split('<br><br>');
        return paragraphs
            .map(p => `<p>${p}</p>`)
            .join('')
            .replace(/<p><\/p>/g, '');
    }

    /**
     * Render entire conversation
     */
    renderConversation() {
        this.messagesContainer.innerHTML = '';
        this.conversationHistory.forEach(msg => this.renderMessage(msg));
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const messageEl = document.createElement('div');
        messageEl.className = 'message ai';
        messageEl.id = 'typing-indicator';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';

        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

        messageEl.appendChild(avatar);
        messageEl.appendChild(indicator);

        this.messagesContainer.appendChild(messageEl);
        this.autoScrollToBottom();
    }

    /**
     * Remove typing indicator
     */
    removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    /**
     * Clear conversation
     */
    clearConversation() {
        if (!confirm('Clear all messages? This cannot be undone.')) return;

        this.conversationHistory = [];
        this.messagesContainer.innerHTML = `
            <div class="message-welcome">
                <h2>Welcome to SkinNet AI</h2>
                <p>Ask questions about skin conditions, treatments, prevention, and more.</p>
                <div class="quick-suggestions">
                    <button class="suggestion-btn">What is eczema?</button>
                    <button class="suggestion-btn">How to prevent acne?</button>
                    <button class="suggestion-btn">Signs of melanoma?</button>
                    <button class="suggestion-btn">Best skincare routine?</button>
                </div>
            </div>
        `;

        this.messagesContainer.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.messageInput.value = btn.textContent;
                this.messageInput.focus();
            });
        });

        localStorage.removeItem(STORAGE_KEY);
        this.messageCount = 0;
    }

    /**
     * Auto-scroll to bottom
     */
    autoScrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 50);
    }

    /**
     * Get conversation context (for resuming)
     */
    getContext() {
        return {
            sessionId: this.sessionId,
            messageCount: this.messageCount,
            lastMessage: this.conversationHistory[this.conversationHistory.length - 1] || null,
            history: this.conversationHistory.slice(-10)
        };
    }

    /**
     * Export conversation as text
     */
    exportConversation() {
        let text = `SkinNet AI Conversation\n`;
        text += `Date: ${new Date().toLocaleString()}\n`;
        text += `Session: ${this.sessionId}\n`;
        text += `---\n\n`;

        this.conversationHistory.forEach(msg => {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            const role = msg.role.toUpperCase();
            text += `[${time}] ${role}:\n${msg.content}\n\n`;
        });

        return text;
    }

    /**
     * Download conversation
     */
    downloadConversation() {
        const text = this.exportConversation();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_${this.sessionId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Load dark mode preference
     */
    loadDarkMode() {
        const saved = localStorage.getItem(DARK_MODE_KEY);
        if (saved === 'true') {
            this.darkMode = true;
            document.body.classList.add('dark-mode');
        }
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            localStorage.setItem(DARK_MODE_KEY, 'true');
            this.darkModeBtn.textContent = '☀️ Light';
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem(DARK_MODE_KEY, 'false');
            this.darkModeBtn.textContent = '🌙 Dark';
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (this.searchInput) this.searchInput.focus();
            }
            // Ctrl/Cmd + Shift + D: Toggle dark mode
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'd') {
                e.preventDefault();
                if (this.darkModeBtn) this.toggleDarkMode();
            }
            // Ctrl/Cmd + Shift + L: Clear conversation
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'l') {
                e.preventDefault();
                this.clearConversation();
            }
            // Focus input: Ctrl/Cmd + /
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.messageInput.focus();
            }
        });
    }

    /**
     * Toggle search UI
     */
    toggleSearch() {
        if (this.searchInput) {
            this.searchInput.style.display = 
                this.searchInput.style.display === 'none' ? 'block' : 'none';
            if (this.searchInput.style.display === 'block') {
                this.searchInput.focus();
            } else {
                this.searchInput.value = '';
                this.searchMessages('');
            }
        }
    }

    /**
     * Search messages
     */
    searchMessages(query) {
        this.searchQuery = query.toLowerCase();
        
        if (!this.searchQuery) {
            this.filteredMessages = [];
            this.renderConversation();
            return;
        }

        this.filteredMessages = this.conversationHistory.filter(msg => 
            msg.content.toLowerCase().includes(this.searchQuery)
        );

        this.messagesContainer.innerHTML = '';
        this.filteredMessages.forEach(msg => {
            this.renderMessage(msg, this.searchQuery);
        });
    }

    /**
     * Copy message to clipboard
     */
    copyMessageToClipboard(messageId) {
        const message = this.conversationHistory.find(m => m.id === messageId);
        if (message) {
            navigator.clipboard.writeText(message.content).then(() => {
                alert('Message copied to clipboard! ✓');
            });
        }
    }

    /**
     * Give feedback on message
     */
    giveFeedback(messageId, feedback) {
        const message = this.conversationHistory.find(m => m.id === messageId);
        if (message) {
            console.log(`Feedback on message ${messageId}: ${feedback}`);
            // Could send to backend for analytics
        }
    }


// Initialize chatbot on page load
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new ChatbotManager();
});
