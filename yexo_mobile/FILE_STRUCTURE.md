# Complete File Structure

## 📁 Root Files

```
Yexo/
├── .env                                    # Environment variables (configure this)
├── .gitignore                              # Git ignore rules
├── App.js                                  # Main application entry point
├── app.config.js                           # Expo configuration
├── app.json                                # Expo app metadata
├── babel.config.js                         # Babel configuration
├── index.js                                # Expo entry point
├── package.json                            # Dependencies and scripts
├── package-lock.json                       # Dependency lock file
│
├── 📄 README.md                            # Complete documentation (START HERE)
├── 📄 QUICKSTART.md                        # Quick setup guide
├── 📄 API_DOCUMENTATION.md                 # Backend API specifications
├── 📄 DEVELOPMENT_GUIDE.md                 # Development best practices
├── 📄 PROJECT_SUMMARY.md                   # Project overview
├── 📄 INSTALLATION_CHECKLIST.md            # Installation steps
└── 📄 FILE_STRUCTURE.md                    # This file
```

## 📁 Source Code (src/)

### API Layer (src/api/)

```
src/api/
├── axios.js                                # Axios instance with interceptors & token refresh
├── auth.api.js                             # Authentication endpoints (login, register, me)
├── chat.api.js                             # Chat management endpoints (list, create, delete)
├── message.api.js                          # Message endpoints (send, fetch, mark seen)
├── group.api.js                            # Group management endpoints (create, add members)
└── upload.api.js                           # File upload endpoint (images, videos, files)
```

### Components (src/components/)

```
src/components/
├── Avatar/
│   └── index.js                           # Avatar component with initials fallback & online dot
├── ChatBubble/
│   └── index.js                           # Message bubble (text, image, video, audio, file)
├── ChatHeader/
│   └── index.js                           # Chat screen header with user info
├── InputBar/
│   └── index.js                           # Message input with attachment button
├── Loader/
│   └── index.js                           # Loading spinner component
├── OnlineDot/
│   └── index.js                           # Online/offline status indicator
└── TypingIndicator/
    └── index.js                           # "User is typing..." indicator
```

### Constants (src/constants/)

```
src/constants/
├── colors.js                               # Theme colors (light & dark mode)
├── endpoints.js                            # API endpoint constants
├── fonts.js                                # Font family and size constants
└── storageKeys.js                          # AsyncStorage key constants
```

### Custom Hooks (src/hooks/)

```
src/hooks/
├── useAuth.js                              # Authentication hook (login, logout, user state)
├── useMessages.js                          # Messages hook (load, add, update messages)
├── usePagination.js                        # Pagination hook (load more, page management)
└── useSocket.js                            # Socket.IO hook (connect, emit, listen)
```

### Navigation (src/navigation/)

```
src/navigation/
├── AppNavigator.js                         # Root navigator with theme & notification setup
├── AuthNavigator.js                        # Auth stack (Login, Register)
├── ChatNavigator.js                        # Chat stack (ChatRoom)
└── MainNavigator.js                        # Main bottom tabs (Chats, Contacts, Settings)
```

### Screens (src/screens/)

```
src/screens/
├── Auth/
│   ├── LoginScreen.js                     # Login screen with form validation
│   └── RegisterScreen.js                  # Registration screen with validation
├── Chat/
│   └── ChatRoomScreen.js                  # Real-time messaging screen (main chat UI)
├── Home/
│   ├── ChatsScreen.js                     # Chat list with search & pull-to-refresh
│   ├── ContactsScreen.js                  # User search & start new chat
│   └── SettingsScreen.js                  # App settings, profile, theme toggle, logout
└── Splash/
    └── SplashScreen.js                    # Splash screen with auto-login check
```

### Services (src/services/)

```
src/services/
├── notification.service.js                 # Push notifications (Expo Notifications)
├── socket.service.js                       # Socket.IO client service (connect, emit, listen)
└── storage.service.js                      # AsyncStorage service (token, user, theme)
```

### State Management (src/store/)

```
src/store/
├── auth.store.js                           # Auth state (user, login, logout, token)
├── chat.store.js                           # Chat list state (chats, create, update, delete)
├── message.store.js                        # Messages state (messages by chat, add, update)
├── socket.store.js                         # Socket state (connection, events, typing users)
└── theme.store.js                          # Theme state (light/dark mode, colors)
```

### Styles (src/styles/)

```
src/styles/
├── globalStyles.js                         # Global style definitions
└── themes.js                               # Light & dark theme definitions
```

### Utils (src/utils/)

```
src/utils/
├── file.js                                 # File utilities (extension, mime type, size)
├── formatMessage.js                        # Message formatting (preview, chat name, avatar)
└── time.js                                 # Time formatting (message time, relative time)
```

## 📁 Assets (assets/)

```
assets/
├── icon.png                                # App icon (1024x1024)
├── splash.png                              # Splash screen image
├── adaptive-icon.png                       # Android adaptive icon
└── favicon.png                             # Web favicon
```

## 📊 File Count Summary

| Category          | Count  | Description                                                                  |
| ----------------- | ------ | ---------------------------------------------------------------------------- |
| **Configuration** | 6      | package.json, babel.config.js, app.config.js, .env, .gitignore, app.json     |
| **Documentation** | 6      | README, guides, API docs                                                     |
| **Entry Points**  | 2      | App.js, index.js                                                             |
| **API Files**     | 6      | axios, auth, chat, message, group, upload                                    |
| **Components**    | 7      | Avatar, ChatBubble, ChatHeader, InputBar, Loader, OnlineDot, TypingIndicator |
| **Constants**     | 4      | colors, endpoints, fonts, storageKeys                                        |
| **Hooks**         | 4      | useAuth, useMessages, usePagination, useSocket                               |
| **Navigation**    | 4      | App, Auth, Chat, Main navigators                                             |
| **Screens**       | 7      | Splash, Login, Register, Chats, Contacts, Settings, ChatRoom                 |
| **Services**      | 3      | notification, socket, storage                                                |
| **Stores**        | 5      | auth, chat, message, socket, theme                                           |
| **Styles**        | 2      | globalStyles, themes                                                         |
| **Utils**         | 3      | file, formatMessage, time                                                    |
| **TOTAL**         | **59** | JavaScript/Config files                                                      |

## 📝 File Categories

### 🔧 Configuration Files (Must Configure)

- `.env` - **ACTION REQUIRED:** Set your backend URL
- `app.config.js` - Expo app configuration
- `babel.config.js` - Babel transpiler config
- `package.json` - Dependencies and scripts

### 📖 Documentation Files (Read First)

1. `README.md` - **START HERE** - Complete project docs
2. `QUICKSTART.md` - Quick setup guide
3. `API_DOCUMENTATION.md` - Backend requirements
4. `DEVELOPMENT_GUIDE.md` - Development best practices
5. `PROJECT_SUMMARY.md` - Feature overview
6. `INSTALLATION_CHECKLIST.md` - Setup checklist

### 🎯 Entry Points

- `index.js` - Expo loads this first
- `App.js` - Your app starts here

### 🌐 API Integration

All files in `src/api/` handle communication with backend:

- Authentication
- Chat operations
- Message operations
- File uploads
- Group management

### 🧩 Reusable Components

All files in `src/components/` are reusable UI components used across screens.

### 📱 Screens

All files in `src/screens/` are full-page screens:

- **Auth**: Login & Registration
- **Home**: Chat list, Contacts, Settings
- **Chat**: Real-time messaging
- **Splash**: Loading screen

### 🗃️ State Management

All files in `src/store/` manage global state using Zustand:

- User authentication state
- Chat list state
- Message state per chat
- Socket connection state
- Theme preference state

### 🛠️ Services

All files in `src/services/` provide core functionality:

- Socket.IO real-time communication
- Local storage management
- Push notification handling

### 🎨 Styling

All files in `src/styles/` define app-wide styles and themes.

### 🔧 Utilities

All files in `src/utils/` provide helper functions for:

- File handling
- Message formatting
- Time formatting

## 🔍 Key File Details

### Most Important Files

1. **App.js** - Main entry, wraps app with providers
2. **src/navigation/AppNavigator.js** - Navigation setup
3. **src/screens/Chat/ChatRoomScreen.js** - Core messaging UI
4. **src/store/\*.store.js** - All state management
5. **src/services/socket.service.js** - Real-time communication
6. **.env** - Configuration (MUST EDIT)

### Files You'll Edit Most

When developing:

- `src/screens/` - Add new screens
- `src/components/` - Add new components
- `src/store/` - Modify state logic
- `src/api/` - Add new endpoints
- `.env` - Change backend URL

### Files You Won't Edit

Usually don't need to modify:

- `index.js` - Expo entry point
- `app.json` - Generated by Expo
- `babel.config.js` - Works as-is
- `node_modules/` - Dependencies

## 📦 Dependencies (package.json)

### Core Dependencies

- `react` & `react-native` - Framework
- `expo` - Development platform
- `@react-navigation/*` - Navigation
- `zustand` - State management
- `axios` - HTTP client
- `socket.io-client` - Real-time messaging

### UI Libraries

- `@expo/vector-icons` - Icons
- `react-native-toast-message` - Notifications

### Forms & Validation

- `formik` - Form handling
- `yup` - Validation schemas

### Storage & Media

- `@react-native-async-storage/async-storage` - Local storage
- `expo-image-picker` - Camera & gallery
- `expo-file-system` - File operations

### Notifications

- `expo-notifications` - Push notifications
- `expo-device` - Device info

### Utilities

- `date-fns` - Date formatting
- `react-native-dotenv` - Environment variables

## 🚀 How to Navigate This Project

### Starting Point

1. Read `README.md`
2. Follow `QUICKSTART.md`
3. Check `INSTALLATION_CHECKLIST.md`

### Understanding Structure

1. Look at `PROJECT_SUMMARY.md`
2. Review this file (`FILE_STRUCTURE.md`)
3. Read `DEVELOPMENT_GUIDE.md`

### Backend Integration

1. Read `API_DOCUMENTATION.md`
2. Check `src/api/` files
3. Review `src/services/socket.service.js`

### Adding Features

1. Read `DEVELOPMENT_GUIDE.md`
2. Check existing files in relevant folder
3. Follow established patterns

## 📊 Code Statistics

- **Total Lines of Code:** ~5,500+
- **JavaScript Files:** 45+
- **Components:** 7 reusable
- **Screens:** 7 full screens
- **State Stores:** 5 Zustand stores
- **API Modules:** 6 files
- **Service Layers:** 3 services
- **Custom Hooks:** 4 hooks
- **Documentation:** 6 comprehensive files

## ✅ File Verification Checklist

Check these files exist:

**Root:**

- [ ] package.json
- [ ] App.js
- [ ] .env
- [ ] README.md

**API:**

- [ ] src/api/axios.js
- [ ] src/api/auth.api.js
- [ ] src/api/chat.api.js

**Stores:**

- [ ] src/store/auth.store.js
- [ ] src/store/chat.store.js
- [ ] src/store/message.store.js

**Screens:**

- [ ] src/screens/Auth/LoginScreen.js
- [ ] src/screens/Chat/ChatRoomScreen.js
- [ ] src/screens/Home/ChatsScreen.js

**Services:**

- [ ] src/services/socket.service.js
- [ ] src/services/storage.service.js

**Navigation:**

- [ ] src/navigation/AppNavigator.js

If all checked, project structure is complete! ✅

---

## 🎯 Quick File Finder

Looking for:

- **Authentication logic?** → `src/store/auth.store.js`
- **API calls?** → `src/api/`
- **Real-time messaging?** → `src/services/socket.service.js`
- **Chat UI?** → `src/screens/Chat/ChatRoomScreen.js`
- **Theme colors?** → `src/constants/colors.js`
- **Navigation?** → `src/navigation/AppNavigator.js`
- **Backend API specs?** → `API_DOCUMENTATION.md`
- **How to start?** → `README.md` or `QUICKSTART.md`

---

**Project structure is complete and organized! 🎉**
