// API Base URLs
export const API_URL = "https://yexo-backend.onrender.com";
export const SOCKET_URL = "https://yexo-backend.onrender.com";

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: `${API_URL}/api/auth/login`,
  REGISTER: `${API_URL}/api/auth/register`,
  ME: `${API_URL}/api/auth/me`,
  REFRESH: `${API_URL}/api/auth/refresh`,
  LOGOUT: `${API_URL}/api/auth/logout`,

  // Chats
  CHATS: `${API_URL}/api/chats`,
  CREATE_CHAT: `${API_URL}/api/chats`,
  CHAT_BY_ID: (id) => `${API_URL}/api/chats/${id}`,

  // Messages
  MESSAGES: (chatId) => `${API_URL}/api/messages/${chatId}`,
  SEND_MESSAGE: (chatId) => `${API_URL}/api/messages/${chatId}`,
  MESSAGE_SEEN: (messageId) => `${API_URL}/api/messages/${messageId}/seen`,
  DELETE_MESSAGE: (messageId) => `${API_URL}/api/messages/${messageId}`,
  UPLOAD_MEDIA: `${API_URL}/api/messages/upload`,

  // Groups
  GROUPS: `${API_URL}/api/groups`,
  GROUP_BY_ID: (id) => `${API_URL}/api/groups/${id}`,
  ADD_MEMBER: (id) => `${API_URL}/api/groups/${id}/members`,
  REMOVE_MEMBER: (id, userId) =>
    `${API_URL}/api/groups/${id}/members/${userId}`,
  LEAVE_GROUP: (id) => `${API_URL}/api/groups/${id}/leave`,

  // Users
  USERS: `${API_URL}/api/users`,
  SEARCH_USERS: `${API_URL}/api/users/search`,
  USER_BY_ID: (id) => `${API_URL}/api/users/${id}`,
  UPDATE_PROFILE: `${API_URL}/api/users/profile`,

  // Upload
  UPLOAD: `${API_URL}/api/messages/upload`,

  // Notifications
  REGISTER_PUSH_TOKEN: `${API_URL}/api/notifications/register`,
};
