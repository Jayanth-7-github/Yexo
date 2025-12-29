/**
 * Application-wide constants
 */

const USER_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
};

const MESSAGE_TYPE = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  FILE: "file",
  CALL: "call",
};

const MESSAGE_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  SEEN: "seen",
};

const SOCKET_EVENTS = {
  // Connection
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  // Authentication
  AUTHENTICATE: "authenticate",
  AUTHENTICATED: "authenticated",
  UNAUTHORIZED: "unauthorized",

  // Chat rooms
  JOIN_CHATS: "join_chats",
  LEAVE_CHAT: "leave_chat",

  // Messaging
  SEND_MESSAGE: "send_message",
  NEW_MESSAGE: "new_message",
  MESSAGE_DELIVERED: "message_delivered",
  MESSAGE_SEEN: "message_seen",
  MESSAGE_REACTION: "message_reaction",

  // Typing
  TYPING: "typing",
  STOP_TYPING: "stop_typing",

  // Presence
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",

  // Calls (WebRTC signaling)
  CALL_INITIATE: "call:initiate",
  CALL_INCOMING: "call:incoming",
  CALL_RINGING: "call:ringing",
  CALL_ACCEPT: "call:accept",
  CALL_ACCEPTED: "call:accepted",
  CALL_DECLINE: "call:decline",
  CALL_DECLINED: "call:declined",
  CALL_END: "call:end",
  CALL_ENDED: "call:ended",
  CALL_BUSY: "call:busy",
  CALL_UNAVAILABLE: "call:unavailable",
  CALL_SIGNAL: "call:signal",

  // Errors
  ERROR: "error",
};

const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  USER_STATUS,
  MESSAGE_TYPE,
  MESSAGE_STATUS,
  SOCKET_EVENTS,
  RATE_LIMIT,
  PAGINATION,
};
