# Backend API Requirements

This document describes the backend API endpoints required for the Yexo chat application.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All authenticated endpoints require JWT token in header:

```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register User

```
POST /auth/register
```

**Request Body:**

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "user": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string | null",
    "createdAt": "string"
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

### Login

```
POST /auth/login
```

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** Same as register

### Get Current User

```
GET /auth/me
Headers: Authorization: Bearer <token>
```

**Response:**

```json
{
  "user": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string | null",
    "isOnline": "boolean"
  }
}
```

### Refresh Token

```
POST /auth/refresh
```

**Request Body:**

```json
{
  "refreshToken": "string"
}
```

**Response:**

```json
{
  "accessToken": "string"
}
```

### Logout

```
POST /auth/logout
Headers: Authorization: Bearer <token>
```

---

## Chat Endpoints

### Get All Chats

```
GET /chats
Headers: Authorization: Bearer <token>
```

**Response:**

```json
{
  "chats": [
    {
      "_id": "string",
      "type": "direct | group",
      "name": "string | null",
      "avatar": "string | null",
      "participants": [
        {
          "_id": "string",
          "username": "string",
          "avatar": "string | null",
          "isOnline": "boolean"
        }
      ],
      "lastMessage": {
        "_id": "string",
        "content": "string",
        "type": "text | image | video | audio | file",
        "senderId": "string",
        "createdAt": "string"
      },
      "unreadCount": "number",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### Create Chat

```
POST /chats
Headers: Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "type": "direct",
  "participantId": "string"
}
```

OR for group:

```json
{
  "type": "group",
  "name": "string",
  "participantIds": ["string"]
}
```

**Response:**

```json
{
  "chat": {
    /* chat object */
  }
}
```

### Get Chat by ID

```
GET /chats/:id
Headers: Authorization: Bearer <token>
```

### Delete Chat

```
DELETE /chats/:id
Headers: Authorization: Bearer <token>
```

---

## Message Endpoints

### Get Messages

```
GET /chats/:chatId/messages?page=1&limit=50
Headers: Authorization: Bearer <token>
```

**Response:**

```json
{
  "messages": [
    {
      "_id": "string",
      "chatId": "string",
      "senderId": "string",
      "type": "text | image | video | audio | file",
      "content": "string",
      "meta": {
        "fileUrl": "string",
        "fileName": "string",
        "fileSize": "number"
      },
      "status": "sent | delivered | seen",
      "replyTo": "string | null",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "page": "number",
  "totalPages": "number"
}
```

### Send Message

```
POST /chats/:chatId/messages
Headers: Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "type": "text",
  "content": "string"
}
```

OR for media:

```json
{
  "type": "image",
  "content": "string (optional caption)",
  "meta": {
    "fileUrl": "string"
  }
}
```

**Response:**

```json
{
  "message": {
    /* message object */
  }
}
```

### Mark Message as Seen

```
PUT /chats/:chatId/messages/:messageId/seen
Headers: Authorization: Bearer <token>
```

### Delete Message

```
DELETE /chats/:chatId/messages/:messageId
Headers: Authorization: Bearer <token>
```

---

## User Endpoints

### Search Users

```
GET /users/search?q=query
Headers: Authorization: Bearer <token>
```

**Response:**

```json
{
  "users": [
    {
      "_id": "string",
      "username": "string",
      "email": "string",
      "avatar": "string | null"
    }
  ]
}
```

---

## Upload Endpoint

### Upload File

```
POST /upload
Headers:
  Authorization: Bearer <token>
  Content-Type: multipart/form-data
```

**Request Body:**

- Form data with file field named "file"

**Response:**

```json
{
  "url": "string",
  "filename": "string",
  "mimetype": "string",
  "size": "number"
}
```

---

## Socket.IO Events

### Connection

```javascript
// Client connects with JWT token
io.connect(url, {
  auth: { token: "jwt_token" },
});
```

### Client → Server Events

#### Send Message

```javascript
socket.emit("send_message", {
  chatId: "string",
  type: "text",
  content: "string",
  meta: {
    /* optional */
  },
});
```

#### Typing

```javascript
socket.emit("typing", {
  chatId: "string",
  isTyping: boolean,
});
```

#### Mark as Seen

```javascript
socket.emit("message_seen", {
  chatId: "string",
  messageId: "string",
});
```

#### Join Chat

```javascript
socket.emit("join_chat", {
  chatId: "string",
});
```

#### Leave Chat

```javascript
socket.emit("leave_chat", {
  chatId: "string",
});
```

### Server → Client Events

#### New Message

```javascript
socket.on("new_message", (message) => {
  // message object with all fields
});
```

#### Message Seen

```javascript
socket.on("message_seen", (data) => {
  // { chatId, messageId, userId }
});
```

#### Typing

```javascript
socket.on("typing", (data) => {
  // { chatId, userId, isTyping }
});
```

#### User Online

```javascript
socket.on("user_online", (data) => {
  // { userId }
});
```

#### User Offline

```javascript
socket.on("user_offline", (data) => {
  // { userId }
});
```

---

## Push Notifications

### Register Push Token

```
POST /notifications/register
Headers: Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "token": "string (Expo push token)",
  "platform": "ios | android"
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "string",
  "message": "string",
  "statusCode": number
}
```

Common status codes:

- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## Notes

1. All timestamps should be in ISO 8601 format
2. File uploads should support images, videos, and documents
3. Maximum file size: 10MB (recommended)
4. Socket.IO should use WebSocket transport
5. JWT tokens should expire after 24 hours
6. Refresh tokens should expire after 30 days
7. Messages should support pagination (50 per page)
8. Online status should be updated based on socket connection
