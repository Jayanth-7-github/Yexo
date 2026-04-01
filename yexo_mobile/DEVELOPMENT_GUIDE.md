# Development Guide

## Getting Started

### First Time Setup

1. Clone/download the project
2. Install dependencies: `npm install`
3. Configure `.env` file with backend URLs
4. Start dev server: `npm start`

### Development Workflow

1. **Make changes** to source files in `src/`
2. **Hot reload** will update the app automatically
3. **Check console** for errors in terminal
4. **Test on device/emulator** frequently

---

## Project Architecture

### State Management (Zustand)

The app uses Zustand for global state management:

- **auth.store.js** - User authentication state
- **chat.store.js** - Chat list and chat operations
- **message.store.js** - Messages by chat ID
- **socket.store.js** - Socket.IO connection and events
- **theme.store.js** - Theme (light/dark) state

**Usage example:**

```javascript
import { useAuthStore } from "../store/auth.store";

const MyComponent = () => {
  const { user, login, logout } = useAuthStore();
  // Use state and actions
};
```

### API Layer

All API calls go through Axios instance with:

- Automatic token injection
- Token refresh on 401
- Global error handling

**Adding a new API:**

```javascript
// src/api/newfeature.api.js
import axios from "./axios";

export const newFeatureAPI = {
  getData: async () => {
    const response = await axios.get("/newfeature");
    return response.data;
  },
};
```

### Socket.IO Integration

Real-time features use Socket.IO:

**Emitting events:**

```javascript
import { useSocketStore } from "../store/socket.store";

const { sendMessage } = useSocketStore();
sendMessage({ chatId, content });
```

**Listening to events:**
Events are automatically handled in `socket.store.js` and update relevant stores.

---

## Adding New Features

### Adding a New Screen

1. Create screen file in `src/screens/[Category]/ScreenName.js`
2. Add to navigator in `src/navigation/`
3. Import and use in navigation stack

Example:

```javascript
// src/screens/Profile/ProfileScreen.js
export const ProfileScreen = ({ navigation, route }) => {
  const { colors } = useThemeStore();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Your UI */}
    </View>
  );
};
```

### Adding a New Component

1. Create folder in `src/components/ComponentName/`
2. Create `index.js` inside
3. Export component

Example:

```javascript
// src/components/CustomButton/index.js
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export const CustomButton = ({ title, onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    /* styles */
  },
  text: {
    /* styles */
  },
});
```

### Adding a New API Endpoint

1. Add to `src/constants/endpoints.js`
2. Create function in relevant API file
3. Use in component or store

Example:

```javascript
// 1. Add endpoint
export const ENDPOINTS = {
  // ... existing
  NEW_FEATURE: "/api/newfeature",
};

// 2. Create API function
export const newFeatureAPI = {
  getFeature: async () => {
    const response = await axios.get(ENDPOINTS.NEW_FEATURE);
    return response.data;
  },
};

// 3. Use in component
const data = await newFeatureAPI.getFeature();
```

---

## Styling Best Practices

### Using Theme Colors

Always use theme colors from the store:

```javascript
import { useThemeStore } from "../store/theme.store";

const MyComponent = () => {
  const { colors } = useThemeStore();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
};
```

### Component Styles

Keep styles at bottom of file:

```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  // ... more styles
});
```

For dynamic styles (based on theme):

```javascript
<View style={[styles.container, { backgroundColor: colors.surface }]} />
```

---

## Common Tasks

### Adding a New Message Type

1. Update message type in ChatBubble component
2. Add upload/send logic in ChatRoomScreen
3. Update backend to handle new type

### Implementing Group Chats

1. Create group.api.js functions
2. Add group creation UI
3. Update ChatRoomScreen to handle group logic
4. Add group info screen

### Adding Voice Messages

1. Use `expo-av` for recording
2. Upload audio file via uploadAPI
3. Send message with type "audio"
4. Add audio player in ChatBubble

---

## Testing Tips

### Testing Real-Time Features

1. Run app on 2 devices/emulators
2. Login with different accounts
3. Send messages between devices
4. Verify real-time updates

### Testing on Physical Device

1. Make sure device and computer are on same network
2. Use computer's local IP in .env
3. Expo Go app must be installed on device
4. Scan QR code from terminal

### Debugging

**View logs:**

```bash
# All logs
npx react-native log-android
npx react-native log-ios

# Or use Expo dev tools
npm start
Press 'j' to open debugger
```

**Debug Socket.IO:**

```javascript
// Add console logs in socket.service.js
this.socket.on("connect", () => {
  console.log("Socket connected:", this.socket.id);
});
```

**Debug API calls:**

```javascript
// Add console logs in axios.js interceptors
console.log("Request:", config.url, config.data);
console.log("Response:", response.data);
```

---

## Performance Tips

### Optimizing Message List

Use FlatList with proper keys:

```javascript
<FlatList
  data={messages}
  keyExtractor={(item) => item._id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
/>
```

### Image Optimization

Use `resizeMode` and optimize uploads:

```javascript
<Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />;

// When picking image
const result = await ImagePicker.launchImageLibraryAsync({
  quality: 0.7, // Compress
  allowsEditing: true,
});
```

### Preventing Memory Leaks

Always cleanup in useEffect:

```javascript
useEffect(() => {
  // Setup
  const subscription = doSomething();

  return () => {
    // Cleanup
    subscription.remove();
  };
}, []);
```

---

## Common Issues & Solutions

### Issue: Socket not connecting

**Solution:**

- Check backend URL in .env
- Verify backend is running
- Use correct IP for your platform
- Check firewall settings

### Issue: Images not displaying

**Solution:**

- Verify image URL is accessible
- Check CORS on backend
- Use HTTPS for production
- Test URL in browser first

### Issue: App crashes on startup

**Solution:**

- Clear cache: `npx expo start -c`
- Check for syntax errors in recently modified files
- Reinstall dependencies
- Check metro bundler logs

### Issue: Push notifications not working

**Solution:**

- Use physical device (not simulator)
- Check permissions granted
- Verify Expo push token
- Test with Expo push notification tool

### Issue: Keyboard covering input

**Solution:**

- Use KeyboardAvoidingView
- Adjust behavior for iOS/Android
- Test on both platforms

---

## Code Quality

### ESLint (Optional)

Add linting to catch errors:

```bash
npm install --save-dev eslint @react-native-community/eslint-config
```

### Prettier (Optional)

Format code consistently:

```bash
npm install --save-dev prettier
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/new-feature
```

---

## Environment Variables

### Development

```
API_URL=http://localhost:5000
SOCKET_URL=http://localhost:5000
```

### Production

```
API_URL=https://api.yourapp.com
SOCKET_URL=https://api.yourapp.com
```

---

## Deployment Checklist

- [ ] Update app.config.js with proper bundle IDs
- [ ] Set production API URLs
- [ ] Generate app icons (1024x1024)
- [ ] Generate splash screen
- [ ] Test on multiple devices
- [ ] Test offline functionality
- [ ] Build and test release version
- [ ] Prepare app store assets
- [ ] Write privacy policy
- [ ] Submit for review

---

## Resources

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)

---

## Need Help?

1. Check console for error messages
2. Read error stack trace carefully
3. Search error on Google/Stack Overflow
4. Check package documentation
5. Ask in React Native community

---

Happy coding! 🚀
