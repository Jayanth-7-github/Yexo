import { create } from "zustand";
import socketService from "../services/socket.service";
import { useMessageStore } from "./message.store";
import { useChatStore } from "./chat.store";

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  typingUsers: {},

  // Initialize socket
  initSocket: async () => {
    try {
      const socket = await socketService.connect();

      if (socket) {
        set({ socket, connected: true });

        // Remove old listeners first to avoid duplicates
        socketService.removeAllListeners();

        // Setup new listeners
        get().setupListeners();
      }
    } catch (error) {
      console.error("Socket init error:", error);
    }
  },

  // Setup socket listeners
  setupListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Message sent (for sender to update temp message)
    socketService.onMessageSent((data) => {
      console.log("=== MESSAGE SENT CONFIRMATION ===");
      console.log("Temp ID:", data.tempId, "Real ID:", data.message._id);
      console.log(
        "Full message from backend:",
        JSON.stringify(data.message, null, 2)
      );

      if (data.tempId && data.message) {
        // Normalize message structure from backend
        const normalizedMessage = {
          ...data.message,
          chatId: data.message.chat || data.message.chatId,
          senderId: data.message.sender?._id || data.message.senderId,
          // Ensure meta structure is preserved
          meta:
            data.message.meta ||
            (data.message.fileUrl
              ? { fileUrl: data.message.fileUrl }
              : undefined),
        };

        console.log("Normalized message:", normalizedMessage);

        // Replace temp message with real message
        useMessageStore
          .getState()
          .replaceMessage(
            normalizedMessage.chatId,
            data.tempId,
            normalizedMessage
          );
      }
    });

    // New message (for receiver)
    socketService.onNewMessage((message) => {
      console.log("=== NEW MESSAGE EVENT ===");
      console.log("Full message object:", JSON.stringify(message, null, 2));

      // Backend sends: { _id, chat, sender: {_id, username, avatarUrl}, type, content, fileUrl, ... }
      // Normalize to frontend format
      const normalizedMessage = {
        ...message,
        chatId: message.chat || message.chatId,
        senderId: message.sender?._id || message.senderId,
        // Ensure meta structure for file messages
        meta:
          message.meta ||
          (message.fileUrl ? { fileUrl: message.fileUrl } : undefined),
        // Don't set status here - let it come from backend or stay as sent
      };

      console.log("Chat ID:", normalizedMessage.chatId);
      console.log("Message ID:", normalizedMessage._id);
      console.log("Normalized message:", normalizedMessage);

      // Check if message already exists (prevent duplicates)
      const messageStore = useMessageStore.getState();
      const existingMessages =
        messageStore.messagesByChat[normalizedMessage.chatId] || [];
      const messageExists = existingMessages.some(
        (msg) => msg._id === normalizedMessage._id
      );

      if (messageExists) {
        console.log("Message already exists, skipping duplicate");
        return;
      }

      console.log("Before adding - messages in chat:", existingMessages.length);

      messageStore.addMessage(normalizedMessage.chatId, normalizedMessage);

      console.log(
        "After adding - messages in chat:",
        messageStore.messagesByChat[normalizedMessage.chatId]?.length || 0
      );

      // Emit delivery confirmation to backend (for double tick)
      socketService.getSocket()?.emit("message_delivered", {
        messageId: normalizedMessage._id,
        chatId: normalizedMessage.chatId,
      });

      // Update chat last message
      useChatStore
        .getState()
        .updateLastMessage(normalizedMessage.chatId, normalizedMessage);

      // Increment unread if not in chat
      // This should be handled based on current screen
    });

    // Message seen
    socketService.onMessageSeen((data) => {
      console.log("Message seen:", data);
      useMessageStore
        .getState()
        .updateMessageStatus(data.chatId, data.messageId, "seen");
    });

    // Message delivered
    socketService.onMessageDelivered((data) => {
      console.log("Message delivered:", data);
      useMessageStore
        .getState()
        .updateMessageStatus(data.chatId, data.messageId, "delivered");
    });

    // Typing
    socketService.onTyping((data) => {
      console.log("User typing:", data);
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [data.chatId]: data.isTyping ? data.userId : null,
        },
      }));
    });

    // User online
    socketService.onUserOnline((data) => {
      console.log("User online:", data.userId);
      useChatStore.getState().updateOnlineStatus(data.userId, true);
    });

    // User offline
    socketService.onUserOffline((data) => {
      console.log("User offline:", data.userId);
      useChatStore.getState().updateOnlineStatus(data.userId, false);
    });

    // Call signaling events
    socket?.on("call_initiate", (data) => {
      console.log("Incoming call:", data);
      // TODO: Show incoming call UI (dispatch to UI store or callback)
    });

    socket?.on("call_offer", (data) => {
      console.log("Received call offer:", data);
      // TODO: Set remote offer in WebRTC peer connection
    });

    socket?.on("call_answer", (data) => {
      console.log("Received call answer:", data);
      // TODO: Set remote answer in WebRTC peer connection
    });

    socket?.on("call_ice_candidate", (data) => {
      console.log("Received ICE candidate:", data);
      // TODO: Add ICE candidate to WebRTC peer connection
    });

    socket?.on("call_end", (data) => {
      console.log("Call ended:", data);
      // TODO: Close call UI and clean up peer connection
    });
  },

  // Send message
  // Call signaling emitters
  initiateCall: (targetUserId, callType = "video") => {
    const socket = socketService.getSocket();
    socket?.emit("call_initiate", { targetUserId, callType });
  },
  sendCallOffer: (targetUserId, offer) => {
    const socket = socketService.getSocket();
    socket?.emit("call_offer", { targetUserId, offer });
  },
  sendCallAnswer: (targetUserId, answer) => {
    const socket = socketService.getSocket();
    socket?.emit("call_answer", { targetUserId, answer });
  },
  sendCallIceCandidate: (targetUserId, candidate) => {
    const socket = socketService.getSocket();
    socket?.emit("call_ice_candidate", { targetUserId, candidate });
  },
  endCall: (targetUserId) => {
    const socket = socketService.getSocket();
    socket?.emit("call_end", { targetUserId });
  },
  sendMessage: (data) => {
    socketService.sendMessage(data);
  },

  // Emit typing
  typing: (chatId, isTyping) => {
    socketService.typing(chatId, isTyping);
  },

  // Mark message as seen
  markMessageSeen: (messageId, chatId) => {
    socketService.markMessageSeen(messageId, chatId);
  },

  // Join chat
  joinChat: (chatId) => {
    socketService.joinChat(chatId);
  },

  // Leave chat
  leaveChat: (chatId) => {
    socketService.leaveChat(chatId);
  },

  // Get typing user for chat
  getTypingUser: (chatId) => {
    return get().typingUsers[chatId];
  },

  // Disconnect socket
  disconnect: () => {
    socketService.disconnect();
    set({ socket: null, connected: false, typingUsers: {} });
  },

  // Reconnect socket
  reconnect: async () => {
    await get().initSocket();
  },
}));
