import { create } from "zustand";
import { messageAPI } from "../api/message.api";

export const useMessageStore = create((set, get) => ({
  // Messages organized by chatId
  messagesByChat: {},
  isLoading: false,
  error: null,
  hasMore: {},
  currentPage: {},

  // Load messages for a chat
  loadMessages: async (chatId, page = 1, limit = 50) => {
    try {
      set({ isLoading: true, error: null });

      const response = await messageAPI.getMessages(chatId, page, limit);
      console.log("Load messages response:", response);

      // Handle different response structures
      let messages = [];
      if (Array.isArray(response.data)) {
        messages = response.data;
      } else if (response.messages) {
        messages = response.messages;
      } else if (Array.isArray(response)) {
        messages = response;
      }

      console.log("Extracted messages array:", messages);

      // Normalize messages from backend
      const normalizedMessages = messages.map((msg) => ({
        ...msg,
        chatId: msg.chat || msg.chatId,
        senderId: msg.sender?._id || msg.senderId,
        // Ensure meta structure for file messages
        meta: msg.meta || (msg.fileUrl ? { fileUrl: msg.fileUrl } : undefined),
      }));

      console.log("Normalized messages:", normalizedMessages);

      set((state) => {
        const existingMessages = state.messagesByChat[chatId] || [];
        const newMessages =
          page === 1
            ? normalizedMessages
            : [...normalizedMessages, ...existingMessages];

        return {
          messagesByChat: {
            ...state.messagesByChat,
            [chatId]: newMessages,
          },
          hasMore: {
            ...state.hasMore,
            [chatId]: messages.length === limit,
          },
          currentPage: {
            ...state.currentPage,
            [chatId]: page,
          },
          isLoading: false,
        };
      });

      return { success: true };
    } catch (error) {
      console.error("Load messages error:", error);
      set({
        error: error.response?.data?.message || "Failed to load messages",
        isLoading: false,
      });
      return { success: false };
    }
  },

  // Add new message
  addMessage: (chatId, message) => {
    console.log(
      "addMessage called - chatId:",
      chatId,
      "messageId:",
      message._id
    );

    set((state) => {
      const existingMessages = state.messagesByChat[chatId];
      const messages = Array.isArray(existingMessages) ? existingMessages : [];

      // Prevent duplicate messages by _id
      if (messages.some((msg) => msg._id === message._id)) {
        console.log("Duplicate message detected, skipping add.");
        return state;
      }

      // If this is a real message replacing a temp message, remove temp
      let filteredMessages = messages.filter(
        (msg) =>
          !(
            msg._id.startsWith("temp_") &&
            msg.content === message.content &&
            msg.senderId === message.senderId
          )
      );

      const newMessages = [...filteredMessages, message];
      console.log("New messages count:", newMessages.length);

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: newMessages,
        },
      };
    });

    console.log("addMessage completed");
  },

  // Replace temporary message with real message from backend
  replaceMessage: (chatId, tempId, realMessage) => {
    console.log("replaceMessage - replacing", tempId, "with", realMessage._id);
    set((state) => {
      const messages = state.messagesByChat[chatId] || [];
      const tempIndex = messages.findIndex((msg) => msg._id === tempId);

      if (tempIndex === -1) {
        console.log("Temp message not found, not adding duplicate");
        return state;
      }

      const updatedMessages = [...messages];
      updatedMessages[tempIndex] = {
        ...realMessage,
        status: "sent", // Update status to sent (single tick)
      };

      console.log("Replaced temp message at index", tempIndex);

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: updatedMessages,
        },
      };
    });
  },

  // Update message (for status changes)
  updateMessage: (chatId, messageId, updates) => {
    set((state) => {
      const messages = state.messagesByChat[chatId];
      if (!Array.isArray(messages)) {
        console.warn("updateMessage: messages is not an array");
        return state;
      }

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: messages.map((msg) =>
            msg._id === messageId ? { ...msg, ...updates } : msg
          ),
        },
      };
    });
  },

  // Update message status (sent, delivered, seen)
  updateMessageStatus: (chatId, messageId, status) => {
    set((state) => {
      const messages = state.messagesByChat[chatId];
      if (!Array.isArray(messages)) {
        console.warn("updateMessageStatus: messages is not an array");
        return state;
      }

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: messages.map((msg) =>
            msg._id === messageId ? { ...msg, status } : msg
          ),
        },
      };
    });
  },

  // Toggle reaction for a message
  toggleReaction: (chatId, messageId, emoji, userId) => {
    set((state) => {
      const messages = state.messagesByChat[chatId] || [];
      const updated = messages.map((msg) => {
        if (msg._id !== messageId) return msg;

        // Ensure reactions map exists: { emoji: [userId,...] }
        const reactions = { ...(msg.reactions || {}) };
        const users = new Set(reactions[emoji] || []);

        if (users.has(userId)) {
          users.delete(userId);
        } else {
          users.add(userId);
        }

        reactions[emoji] = Array.from(users);

        // Clean up empty emoji keys
        if (reactions[emoji].length === 0) delete reactions[emoji];

        return { ...msg, reactions };
      });

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: updated,
        },
      };
    });
  },

  // Mark message as seen
  markAsSeen: async (chatId, messageId) => {
    try {
      await messageAPI.markAsSeen(chatId, messageId);
      get().updateMessageStatus(chatId, messageId, "seen");
    } catch (error) {
      console.error("Mark as seen error:", error);
    }
  },

  // Mark all messages in chat as seen
  markAllAsSeen: async (chatId) => {
    const messages = get().messagesByChat[chatId] || [];

    // Ensure messages is an array
    if (!Array.isArray(messages)) {
      console.warn("markAllAsSeen: messages is not an array", messages);
      return;
    }

    // Temporarily disabled - backend endpoint needs to be configured
    console.log("markAllAsSeen: Skipping API calls (endpoint not available)");

    /* Commented out until backend endpoint is available
    const unseenMessages = messages.filter((msg) => msg.status !== "seen");

    for (const msg of unseenMessages) {
      try {
        await messageAPI.markAsSeen(chatId, msg._id);
      } catch (error) {
        console.error("Mark as seen error:", error);
      }
    }

    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: messages.map((msg) => ({ ...msg, status: "seen" })),
      },
    }));
    */
  },

  // Delete message
  deleteMessage: async (chatId, messageId) => {
    try {
      await messageAPI.deleteMessage(chatId, messageId);

      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: state.messagesByChat[chatId]?.filter(
            (msg) => msg._id !== messageId
          ),
        },
      }));

      return { success: true };
    } catch (error) {
      console.error("Delete message error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete message",
      };
    }
  },

  // Get messages for chat
  getMessages: (chatId) => {
    return get().messagesByChat[chatId] || [];
  },

  // Clear messages for chat
  clearMessages: (chatId) => {
    set((state) => {
      const newMessagesByChat = { ...state.messagesByChat };
      delete newMessagesByChat[chatId];
      return { messagesByChat: newMessagesByChat };
    });
  },

  // Clear all messages
  clearAllMessages: () => {
    set({ messagesByChat: {}, hasMore: {}, currentPage: {} });
  },
}));
