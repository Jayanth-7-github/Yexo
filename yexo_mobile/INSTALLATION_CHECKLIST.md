# Installation & Setup Checklist

## ✅ Pre-Installation Checklist

- [ ] Node.js installed (v16 or higher)
- [ ] npm or yarn installed
- [ ] Expo CLI installed globally (`npm install -g expo-cli`)
- [ ] iOS Simulator (Mac) or Android Emulator installed
- [ ] Expo Go app on physical device (optional)
- [ ] Backend server running and accessible

## ✅ Installation Steps

### 1. Install Dependencies

```bash
cd Yexo
npm install
```

**Expected output:**

- Dependencies installed successfully
- No critical errors
- May see peer dependency warnings (safe to ignore)

### 2. Configure Environment

Edit `.env` file:

**For Android Emulator:**

```
API_URL=http://10.0.2.2:5000
SOCKET_URL=http://10.0.2.2:5000
```

**For iOS Simulator:**

```
API_URL=http://localhost:5000
SOCKET_URL=http://localhost:5000
```

**For Physical Device:**

```
API_URL=http://192.168.1.XXX:5000
SOCKET_URL=http://192.168.1.XXX:5000
```

(Replace XXX with your computer's local IP)

### 3. Start Development Server

```bash
npm start
```

**Expected output:**

- Metro bundler starts
- QR code displayed
- Options to press `i` (iOS), `a` (Android), `w` (web)

### 4. Launch App

**On iOS Simulator:**

- Press `i` in terminal
- Simulator opens automatically
- App loads

**On Android Emulator:**

- Start emulator first
- Press `a` in terminal
- App installs and opens

**On Physical Device:**

- Install Expo Go app
- Scan QR code
- App loads

## ✅ Verify Installation

### Test 1: App Launches

- [ ] Splash screen appears
- [ ] No red error screens
- [ ] Transitions to Login screen

### Test 2: Navigation Works

- [ ] Can navigate to Register screen
- [ ] Can go back to Login

### Test 3: Theme Toggle (Settings Mock)

- [ ] Light/dark theme toggle works
- [ ] Colors change appropriately

## ✅ Backend Connection Test

### Prerequisites

- [ ] Backend server is running
- [ ] Backend URL is correct in .env
- [ ] Backend is accessible from your device

### Test Connection

1. Try to register a new account
2. Check terminal for API calls
3. Look for network errors

**If connection fails:**

- Verify backend URL
- Check firewall settings
- Ensure backend is running
- Try `curl` to test backend URL

## ✅ Feature Testing Checklist

### Authentication

- [ ] Register new user
- [ ] Login with credentials
- [ ] Auto-login on app restart
- [ ] Logout works

### Chat List

- [ ] Chats load from backend
- [ ] Pull-to-refresh works
- [ ] Search chats works
- [ ] Unread badges show

### Messaging

- [ ] Can send text messages
- [ ] Messages appear in real-time
- [ ] Typing indicator works
- [ ] Message status updates

### Media Upload

- [ ] Camera permission requested
- [ ] Can take photo
- [ ] Can select from gallery
- [ ] Image uploads successfully
- [ ] Image displays in chat

### Real-Time Features

- [ ] Socket connects successfully
- [ ] Messages arrive in real-time
- [ ] Online status updates
- [ ] Typing indicators work

### Theme

- [ ] Can switch to dark mode
- [ ] Theme persists on restart
- [ ] All screens respect theme

## ✅ Platform-Specific Tests

### iOS

- [ ] App runs on simulator
- [ ] Safe area respected
- [ ] Keyboard behavior correct
- [ ] Notifications work (on device)

### Android

- [ ] App runs on emulator
- [ ] Back button works
- [ ] Status bar color correct
- [ ] Notifications work

## ✅ Common Issues & Solutions

### Issue: Dependencies won't install

**Solution:**

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Issue: Metro bundler errors

**Solution:**

```bash
npm start -- --reset-cache
# or
npx expo start -c
```

### Issue: "Unable to resolve module"

**Solution:**

```bash
watchman watch-del-all
rm -rf node_modules
npm install
npm start -- --reset-cache
```

### Issue: Socket won't connect

**Solution:**

- Check backend URL in .env
- Verify backend is running
- Test with: `curl http://YOUR_BACKEND_URL/api/auth/me`
- Check firewall settings

### Issue: Images not uploading

**Solution:**

- Check permissions granted
- Verify upload endpoint exists
- Check backend logs
- Test upload manually with Postman

### Issue: App crashes on startup

**Solution:**

- Check metro bundler logs
- Look for syntax errors
- Clear cache and restart
- Check recent changes

## ✅ Performance Checklist

- [ ] App starts in < 3 seconds
- [ ] Chat list scrolls smoothly
- [ ] Messages load quickly
- [ ] No memory warnings
- [ ] Socket stays connected
- [ ] Images load efficiently

## ✅ Before Production

- [ ] Update app.config.js with proper IDs
- [ ] Set production API URLs
- [ ] Generate app icons (1024x1024)
- [ ] Generate splash screen (1242x2436)
- [ ] Test on multiple devices
- [ ] Test offline behavior
- [ ] Review all permissions
- [ ] Prepare store listings
- [ ] Write privacy policy
- [ ] Build release version
- [ ] Test release build
- [ ] Submit to stores

## ✅ Documentation Review

- [ ] Read README.md
- [ ] Review API_DOCUMENTATION.md
- [ ] Check DEVELOPMENT_GUIDE.md
- [ ] Understand project structure
- [ ] Know how to add features

## ✅ Ready to Develop!

Once all checks pass:

- ✅ Installation complete
- ✅ App running
- ✅ Backend connected
- ✅ Features working
- ✅ Ready for development

---

## 🎉 Installation Complete!

Your Yexo chat application is now:

- ✅ Installed
- ✅ Configured
- ✅ Running
- ✅ Connected to backend
- ✅ Ready for testing and development

**Happy coding! 🚀**

---

## Need Help?

1. Check error messages in terminal
2. Review documentation files
3. Search React Native docs
4. Check Expo documentation
5. Google the error message

---

## Quick Commands Reference

```bash
# Start dev server
npm start

# Clear cache
npm start -- --reset-cache

# Reinstall dependencies
rm -rf node_modules && npm install

# Run on iOS
npm start
# Then press 'i'

# Run on Android
npm start
# Then press 'a'
```
