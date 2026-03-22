# SkinNet Chat History Feature

A responsive, modern chat interface with persistent history management. Saves all conversations locally and supports optional server sync.

## 🎯 Features

✅ **Multi-session chat management** - Create and switch between multiple conversations  
✅ **Persistent storage** - localStorage keeps chats even after browser refresh  
✅ **Responsive design** - Works perfectly on desktop, tablet, and mobile  
✅ **No dependencies** - Pure vanilla JavaScript, HTML, and CSS  
✅ **Search functionality** - Find chats by keyword  
✅ **Export chats** - Download conversation as text  
✅ **Dual mode support** - Works offline (localStorage) or online (with backend)  

## 📁 Project Structure

```
skin-chat-history/
├── index.html           # Chat UI (sidebar + message area)
├── style.css           # Responsive styling
├── script.js           # localStorage logic & event handlers
└── INTEGRATION_GUIDE.js # Backend integration examples
```

## 🚀 Quick Start

### Browser Only (No Server)

1. **Open in browser**
   ```bash
   # Simply open the file directly
   open index.html
   # Or start a simple HTTP server
   python -m http.server 8000
   # Then visit http://localhost:8000
   ```

2. **Start chatting**
   - Type question about skin health
   - Click "Send" or press Enter
   - Messages save automatically
   - History persists on reload

3. **Manage history**
   - Click chat title in sidebar to switch
   - Click "Delete" to remove single chat
   - Click "Clear All" to remove everything

### With Backend Server (Multi-device Sync)

1. **Start FastAPI server**
   ```bash
   cd backend
   uvicorn main:app --reload
   # Server runs at http://localhost:8000
   ```

2. **Connect frontend to backend**
   - Edit `script.js` and implement backend sync
   - See `INTEGRATION_GUIDE.js` for examples
   - Or use HybridChatManager class (offline + online)

3. **Verify endpoints**
   ```bash
   # Test API
   curl http://localhost:8000/api/chat
   curl http://localhost:8000/api/chat/stats
   ```

## 💻 Usage

### Creating a Chat
- Type your message and click **Send**
- First message becomes chat title
- Chat appears in left sidebar
- Auto-saves to localStorage

### Switching Chats
- Click any chat in sidebar
- Messages load instantly
- Sidebar highlights active chat

### Deleting
- **Delete single**: Click × on chat in sidebar
- **Delete all**: Click "Clear All" button (with confirmation)

### Search (Backend API)
- Use `/api/chat/search/keyword?keyword=eczema`
- Returns matching chats instantly

### Export Chat (Backend API)
- Use `POST /api/chat/{chat_id}/export`
- Shows chat preview as text
- Can save for offline reference

## 🔌 Backend API Endpoints

All endpoints accessible at `http://localhost:8000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Create new chat |
| GET | `/chat` | List all chats |
| GET | `/chat/{id}` | Get chat details |
| POST | `/chat/{id}/message` | Add message |
| GET | `/chat/{id}/message` | Get messages |
| DELETE | `/chat/{id}` | Delete chat |
| GET | `/chat/search/keyword` | Search chats |
| GET | `/chat/stats` | Get statistics |

See `CHAT_API_REFERENCE.md` for detailed documentation.

## 📱 Responsive Breakpoints

| Screen Size | Layout |
|-------------|--------|
| Desktop (>768px) | 2 columns: Sidebar + Chat |
| Tablet (480-768px) | Single column, collapsible sidebar |
| Mobile (<480px) | Chat only, sidebar hidden |

## 🛠 Customization

### Change AI Responses
Edit `dummyResponses` array in `script.js`:
```javascript
const dummyResponses = [
    "Your custom response 1",
    "Your custom response 2",
    // Add more...
];
```

### Create Real AI Endpoint
Replace dummy responses with API call:
```javascript
async function getAIResponse(userMessage) {
    const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
    });
    const data = await response.json();
    return data.response;
}
```

### Change Storage Prefix
```javascript
const STORAGE_KEY = 'myCustomChatKey';
```

### Customize Styling
Edit `style.css`:
- Primary color: `#007bff` → change to your brand color
- Font: `-apple-system, BlinkMacSystemFont...` → your font
- Spacing: `1rem` → adjust padding/margins

## 🔒 Security Notes

### Frontend (localStorage)
⚠️ **Warning**: NOT secure for sensitive data
- ✅ Suitable for demo/learning
- ❌ Not for medical/personal data storage
- Any JavaScript can access localStorage
- Cleared if user clears browser data

### Backend (Database)
✅ **Recommended for production**
- User authentication required
- Encrypted database storage
- Access controls per user
- Audit logging available

## 📊 Storage Limits

| Aspect | Limit |
|--------|-------|
| localStorage per domain | 5-10 MB (varies by browser) |
| Average chat size | ~50 KB (100 messages) |
| Estimated capacity | 100-200 chats per user |

## ⚡ Performance Tips

1. **Limit chat list**: Show 50 most recent, not all
2. **Paginate messages**: Load 50 per scroll, not all at once
3. **Batch saves**: Save multiple messages in one operation
4. **Use search**: Instead of loading all chats, search for keyword

## 🐛 Troubleshooting

### Issue: Chats Lost After Refresh
**Solution**: Check browser settings
- Enable localStorage (Settings → Privacy → Storage)
- Check if cookies/storage set to "clear on exit"
- Try incognito/private window

### Issue: Button Not Working
**Solution**: Check browser console (F12 → Console tab)
- Look for red error messages
- Verify JavaScript loaded (check Sources tab)
- Check for errors in Network tab

### Issue: Backend Not Working
**Solution**: Verify server running
```bash
# Terminal 1: Start FastAPI
cd backend && uvicorn main:app --reload

# Terminal 2: Check API
curl http://localhost:8000/api/chat/stats
```

### Issue: Slow Performance
**Solution**: Too many chats/messages
- Implement pagination (load 50 at a time)
- Archive old chats
- Use database backend instead of localStorage

## 📚 Related Documentation

- [Chat History Docs](../CHAT_HISTORY_DOCS.md) - Full feature guide
- [Chat API Reference](../CHAT_API_REFERENCE.md) - All endpoints
- [Integration Guide](./INTEGRATION_GUIDE.js) - Backend integration code
- [Main README](../README.md) - Project overview

## 🎓 Learning Resources

### Concepts Used

**Frontend:**
- localStorage API
- Event listeners
- DOM manipulation
- CSS Grid/Flexbox
- Responsive design
- XSS prevention (HTML escaping)

**Backend:**
- FastAPI routing
- Pydantic models
- RESTful API design
- CORS configuration
- In-memory storage (demo)

### Exercises

1. **Easy**: Change color scheme in style.css
2. **Medium**: Add message editing functionality
3. **Hard**: Integrate with real AI API (e.g., OpenAI, Gemini)
4. **Expert**: Add database persistence + user authentication

## 🚀 Future Enhancements

- [ ] Database integration (PostgreSQL)
- [ ] User authentication
- [ ] Real-time sync across devices
- [ ] Message reactions/emojis
- [ ] Chat pinning/favorites
- [ ] Full-text search
- [ ] Export to PDF
- [ ] Chat sharing
- [ ] Dark mode
- [ ] Multi-language support

## 📝 License

Part of SkinNet Analyzer project. See main LICENSE file.

## 🤝 Contributing

Found a bug or want to improve? 
1. Report in Issues
2. Submit a Pull Request
3. Follow code style in existing files

## 📞 Support

Questions or need help?
- Check the documentation files
- Review INTEGRATION_GUIDE.js for examples
- Check browser console for error messages
- Refer to main project README

---

**Happy chatting! 🎉**
