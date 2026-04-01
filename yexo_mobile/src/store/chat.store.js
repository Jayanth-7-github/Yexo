import { create } from "zustand";
import { chatAPI } from "../api/chat.api";

export const useChatStore = create((set, get) => ({
  chats: [],
  isLoading: false,
  error: null,
  selectedChat: null,

  // Load chats
  loadChats: async () => {
    try {
      console.log("=== LOADING CHATS ===");
      set({ isLoading: true, error: null });
      const response = await chatAPI.getChats();
      console.log("Raw response from API:", response);

      // Handle different response structures
      let chatsData = [];
      if (Array.isArray(response.data)) {
        chatsData = response.data;
      } else if (response.data?.chats) {
        chatsData = response.data.chats;
      } else if (response.chats) {
        chatsData = response.chats;
      } else if (Array.isArray(response)) {
        chatsData = response;
      }

      console.log("Processed chats data:", chatsData);
      console.log("Is array?", Array.isArray(chatsData));
      console.log("Number of chats:", chatsData.length);

      set({
        chats: Array.isArray(chatsData) ? chatsData : [],
        isLoading: false,
      });

      console.log("Chats stored in state");
    } catch (error) {
      console.error("Load chats error:", error);
      console.error("Error response:", error.response?.data);
      set({
        chats: [],
        error: error.response?.data?.message || "Failed to load chats",
        isLoading: false,
      });
    }
  },

  // Create chat
  createChat: async (chatData) => {
    try {
      const data = await chatAPI.createChat(chatData);
      const newChat = data.chat || data;

      set((state) => ({
        chats: [newChat, ...state.chats],
      }));

      return { success: true, chat: newChat };
    } catch (error) {
      console.error("Create chat error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create chat",
      };
    }
  },

  // Update chat (for last message, etc.)
  updateChat: (chatId, updates) => {
    set((state) => ({
      chats: Array.isArray(state.chats)
        ? state.chats.map((chat) =>
            chat._id === chatId ? { ...chat, ...updates } : chat
          )
        : [],
    }));
  },

  // Update last message
  updateLastMessage: (chatId, message) => {
    set((state) => ({
      chats: Array.isArray(state.chats)
        ? state.chats.map((chat) =>
            chat._id === chatId
              ? {
                  ...chat,
                  lastMessage: message,
                  updatedAt: message.createdAt || new Date().toISOString(),
                }
              : chat
          )
        : [],
    }));

    // Sort chats by last message time
    get().sortChats();
  },

  // Sort chats by last message time
  sortChats: () => {
    set((state) => ({
      chats: Array.isArray(state.chats)
        ? [...state.chats].sort((a, b) => {
            const timeA =
              a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
            const timeB =
              b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
            return new Date(timeB) - new Date(timeA);
          })
        : [],
    }));
  },

  // Increment unread count
  incrementUnread: (chatId) => {
    set((state) => ({
      chats: Array.isArray(state.chats)
        ? state.chats.map((chat) =>
            chat._id === chatId
              ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
              : chat
          )
        : [],
    }));
  },

  // Clear unread count
  clearUnread: (chatId) => {
    set((state) => ({
      chats: Array.isArray(state.chats)
        ? state.chats.map((chat) =>
            chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
          )
        : [],
    }));
  },

  // Set selected chat
  setSelectedChat: (chat) => {
    set({ selectedChat: chat });
  },

  // Delete chat
  deleteChat: async (chatId) => {
    try {
      await chatAPI.deleteChat(chatId);
      set((state) => ({
        chats: Array.isArray(state.chats)
          ? state.chats.filter((chat) => chat._id !== chatId)
          : [],
      }));
      return { success: true };
    } catch (error) {
      console.error("Delete chat error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete chat",
      };
    }
  },

  // Update online status
  updateOnlineStatus: (userId, isOnline) => {
    set((state) => ({
      chats: Array.isArray(state.chats)
        ? state.chats.map((chat) => {
            if (chat.type === "direct") {
              const otherUser = chat.participants?.find(
                (p) => p._id === userId
              );
              if (otherUser) {
                return {
                  ...chat,
                  participants: chat.participants.map((p) =>
                    p._id === userId ? { ...p, isOnline } : p
                  ),
                };
              }
            }
            return chat;
          })
        : [],
    }));
  },

  // Clear all chats
  clearChats: () => {
    set({ chats: [], selectedChat: null });
  },
}));
