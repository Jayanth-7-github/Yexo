# Quick Start Guide

## Installation

1. Install dependencies:

```bash
npm install
```

2. Update `.env` file with your backend URL:

```
API_URL=http://YOUR_BACKEND_IP:5000
SOCKET_URL=http://YOUR_BACKEND_IP:5000
```

For Android emulator use: `http://10.0.2.2:5000`
For iOS simulator use: `http://localhost:5000`
For physical device use your computer's IP: `http://192.168.1.XXX:5000`

3. Start the development server:

```bash
npm start
```

4. Run on your device:

- iOS: Press `i`
- Android: Press `a`
- Physical device: Scan QR code with Expo Go app

## Important Notes

### Backend Requirements

This app requires a backend server with:

- REST API endpoints for auth, chats, messages
- Socket.IO for real-time messaging
- File upload support

See README.md for complete endpoint list.

### Features Included

✅ User authentication (register/login)
✅ Real-time messaging with Socket.IO
✅ One-to-one and group chats
✅ Typing indicators
✅ Message read receipts
✅ Online/offline status
✅ Image/video upload
✅ Push notifications
✅ Light/dark theme
✅ WhatsApp-like UI

### Testing

1. Register a new account
2. Search for users in Contacts tab
3. Start a chat
4. Send messages, images, etc.
5. Test on multiple devices for real-time sync

### Troubleshooting

**Socket not connecting?**

- Check backend URL in .env
- Make sure backend is running
- Use correct IP for your platform

**Build errors?**

- Clear cache: `npx expo start -c`
- Reinstall: `rm -rf node_modules && npm install`

**Images not uploading?**

- Check backend upload endpoint
- Verify multipart/form-data support

For more details, see README.md
