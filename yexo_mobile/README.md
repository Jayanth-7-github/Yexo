# Yexo - WhatsApp-like Chat Application

A full-featured mobile chat application built with React Native + Expo, featuring real-time messaging, end-to-end encryption support, group chats, media sharing, and more.

## 🚀 Features

### Authentication

- ✅ User registration and login
- ✅ JWT-based authentication
- ✅ Secure token storage with AsyncStorage
- ✅ Auto-login on app restart
- ✅ Form validation with Formik + Yup

### Real-Time Messaging

- ✅ Socket.IO integration for real-time communication
- ✅ One-to-one chats
- ✅ Group chats support
- ✅ Typing indicators
- ✅ Message delivery & read receipts (sent, delivered, seen)
- ✅ Online/offline presence indicators

### Message Types

- ✅ Text messages
- ✅ Image messages
- ✅ Video messages
- ✅ Audio messages (structure ready)
- ✅ File messages (structure ready)

### UI/UX

- ✅ WhatsApp-like modern UI
- ✅ Light & Dark theme support
- ✅ Smooth animations
- ✅ Pull-to-refresh for chat list
- ✅ Infinite scroll for messages
- ✅ Custom chat bubbles
- ✅ Avatar with initials fallback
- ✅ Unread message badges

### Media Handling

- ✅ Image picker (camera & gallery)
- ✅ File upload to backend
- ✅ Image preview in chat
- ✅ Video support (structure ready)

### Push Notifications

- ✅ Expo push notifications setup
- ✅ Notification permissions
- ✅ Local notifications
- ✅ Remote notifications (when integrated with backend)

### State Management

- ✅ Zustand for global state
- ✅ Separate stores for auth, chat, messages, socket, theme
- ✅ Efficient state updates

### Additional Features

- ✅ User search
- ✅ Contact list
- ✅ Settings screen
- ✅ Profile management (structure ready)
- ✅ Toast notifications for feedback
- ✅ Error handling

## 📁 Project Structure

```
Yexo/
├── App.js                          # Main app entry
├── app.config.js                   # Expo configuration
├── babel.config.js                 # Babel configuration
├── package.json                    # Dependencies
├── .env                           # Environment variables
└── src/
    ├── api/                       # API layer
    │   ├── axios.js              # Axios instance with interceptors
    │   ├── auth.api.js           # Authentication API
    │   ├── chat.api.js           # Chat API
    │   ├── message.api.js        # Message API
    │   ├── group.api.js          # Group API
    │   └── upload.api.js         # Upload API
    ├── components/                # Reusable components
    │   ├── Avatar/
    │   ├── ChatBubble/
    │   ├── ChatHeader/
    │   ├── InputBar/
    │   ├── Loader/
    │   ├── OnlineDot/
    │   └── TypingIndicator/
    ├── constants/                 # Constants
    │   ├── colors.js
    │   ├── endpoints.js
    │   ├── fonts.js
    │   └── storageKeys.js
    ├── hooks/                     # Custom hooks
    │   ├── useAuth.js
    │   ├── useMessages.js
    │   ├── usePagination.js
    │   └── useSocket.js
    ├── navigation/                # Navigation
    │   ├── AppNavigator.js
    │   ├── AuthNavigator.js
    │   ├── ChatNavigator.js
    │   └── MainNavigator.js
    ├── screens/                   # All screens
    │   ├── Auth/
    │   │   ├── LoginScreen.js
    │   │   └── RegisterScreen.js
    │   ├── Chat/
    │   │   └── ChatRoomScreen.js
    │   ├── Home/
    │   │   ├── ChatsScreen.js
    │   │   ├── ContactsScreen.js
    │   │   └── SettingsScreen.js
    │   └── Splash/
    │       └── SplashScreen.js
    ├── services/                  # Services
    │   ├── notification.service.js
    │   ├── socket.service.js
    │   └── storage.service.js
    ├── store/                     # Zustand stores
    │   ├── auth.store.js
    │   ├── chat.store.js
    │   ├── message.store.js
    │   ├── socket.store.js
    │   └── theme.store.js
    ├── styles/                    # Styles
    │   ├── globalStyles.js
    │   └── themes.js
    └── utils/                     # Utility functions
        ├── file.js
        ├── formatMessage.js
        └── time.js
```

## 🛠️ Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator

### Steps

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Edit the `.env` file with your backend URL:

   ```
   API_URL=http://YOUR_BACKEND_IP:5000
   SOCKET_URL=http://YOUR_BACKEND_IP:5000
   ```

   ⚠️ **Important:**

   - For Android emulator: Use `http://10.0.2.2:5000` (localhost alias)
   - For iOS simulator: Use `http://localhost:5000`
   - For physical device: Use your computer's local IP (e.g., `http://192.168.1.100:5000`)

3. **Start the app:**

   ```bash
   npm start
   ```

4. **Run on device/emulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## 🔌 Backend Integration

This frontend is designed to work with a Node.js + Express + Socket.IO backend. Make sure your backend has the following endpoints:

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout user

### Chat Endpoints

- `GET /api/chats` - Get all chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get chat by ID
- `DELETE /api/chats/:id` - Delete chat

### Message Endpoints

- `GET /api/chats/:chatId/messages` - Get messages (paginated)
- `POST /api/chats/:chatId/messages` - Send message
- `PUT /api/chats/:chatId/messages/:messageId/seen` - Mark as seen
- `DELETE /api/chats/:chatId/messages/:messageId` - Delete message

### User Endpoints

- `GET /api/users/search?q=query` - Search users

### Upload Endpoints

- `POST /api/upload` - Upload file (multipart/form-data)

### Socket.IO Events

**Client emits:**

- `send_message` - Send new message
- `typing` - User typing status
- `message_seen` - Mark message as seen
- `join_chat` - Join chat room
- `leave_chat` - Leave chat room

**Server emits:**

- `new_message` - New message received
- `message_seen` - Message seen by recipient
- `typing` - User typing notification
- `user_online` - User came online
- `user_offline` - User went offline

## 🎨 Customization

### Change Theme Colors

Edit `src/constants/colors.js`:

```javascript
export const COLORS = {
  light: {
    primary: "#075E54", // Change primary color
    secondary: "#25D366", // Change secondary color
    // ... other colors
  },
  dark: {
    primary: "#00A884",
    secondary: "#25D366",
    // ... other colors
  },
};
```

### Change App Name

Edit `app.config.js`:

```javascript
export default {
  expo: {
    name: "Your App Name",
    slug: "your-app-slug",
    // ...
  },
};
```

## 📱 Testing

### Test User Registration

1. Open app
2. Click "Sign up"
3. Fill in username, email, password
4. Submit

### Test Real-Time Chat

1. Register/login on two devices
2. Start a chat from one device
3. Send messages
4. Observe real-time updates

### Test Media Upload

1. Open any chat
2. Click '+' button
3. Select camera or photo library
4. Send image

## 🐛 Troubleshooting

### Socket connection fails

- Check your backend URL in `.env`
- Ensure backend is running
- For Android emulator, use `10.0.2.2` instead of `localhost`
- For physical device, ensure you're on the same network

### Images not uploading

- Check upload endpoint URL
- Verify backend accepts multipart/form-data
- Check file size limits on backend

### Push notifications not working

- Run on physical device (notifications don't work in simulators)
- Check notification permissions
- Verify Expo push token registration

### Build errors

- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Reset metro bundler

## 📚 Key Technologies

- **React Native** - Mobile framework
- **Expo** - Development platform
- **Socket.IO Client** - Real-time communication
- **Zustand** - State management
- **React Navigation** - Navigation
- **Axios** - HTTP client
- **Formik + Yup** - Form validation
- **AsyncStorage** - Local storage
- **Expo Image Picker** - Media selection
- **Expo Notifications** - Push notifications
- **date-fns** - Date formatting

## 🚀 Deployment

### Build for Production

**Android:**

```bash
expo build:android
```

**iOS:**

```bash
expo build:ios
```

### Using EAS Build (Recommended)

```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## 📄 License

This project is open source and available for learning purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please create an issue in the repository.

---

Built with ❤️ using React Native + Expo
