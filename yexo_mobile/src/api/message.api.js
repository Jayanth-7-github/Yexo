import axios from "./axios";
import { ENDPOINTS } from "../constants/endpoints";

export const messageAPI = {
  // Get messages for a chat
  getMessages: async (chatId, page = 1, limit = 50) => {
    const response = await axios.get(ENDPOINTS.MESSAGES(chatId), {
      params: { page, limit },
    });
    return response.data;
  },

  // Send message
  sendMessage: async (chatId, messageData) => {
    const response = await axios.post(
      ENDPOINTS.SEND_MESSAGE(chatId),
      messageData
    );
    return response.data;
  },

  // Mark message as seen
  markAsSeen: async (chatId, messageId) => {
    const response = await axios.put(ENDPOINTS.MESSAGE_SEEN(messageId));
    return response.data;
  },

  // Delete message
  deleteMessage: async (chatId, messageId) => {
    const response = await axios.delete(
      `${ENDPOINTS.MESSAGES(chatId)}/${messageId}`
    );
    return response.data;
  },
};
