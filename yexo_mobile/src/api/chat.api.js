import axios from "./axios";
import { ENDPOINTS } from "../constants/endpoints";

export const chatAPI = {
  // Get all chats
  getChats: async () => {
    const response = await axios.get(ENDPOINTS.CHATS);
    return response.data;
  },

  // Search chats
  searchChats: async (query) => {
    const response = await axios.get(ENDPOINTS.CHATS, {
      params: { search: query },
    });
    return response.data;
  },

  // Create new chat
  createChat: async (data) => {
    const response = await axios.post(ENDPOINTS.CREATE_CHAT, data);
    return response.data;
  },

  // Get chat by ID
  getChatById: async (chatId) => {
    const response = await axios.get(ENDPOINTS.CHAT_BY_ID(chatId));
    return response.data;
  },

  // Delete chat
  deleteChat: async (chatId) => {
    const response = await axios.delete(ENDPOINTS.CHAT_BY_ID(chatId));
    return response.data;
  },

  // Search users
  searchUsers: async (query) => {
    const response = await axios.get(ENDPOINTS.SEARCH_USERS, {
      params: { q: query },
    });
    return response.data;
  },
};
