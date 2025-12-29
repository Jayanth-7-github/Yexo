const socketIO = require("socket.io");
const AuthService = require("../services/auth.service");
const UserService = require("../services/user.service");
const MessageService = require("../services/message.service");
const ChatService = require("../services/chat.service");
const EncryptionService = require("../services/encryption.service");
const {
  SOCKET_EVENTS,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
} = require("../utils/constants");
const logger = require("../utils/logger");
const config = require("../config/config");

// Store socket ID to user ID mapping
const userSockets = new Map(); // userId -> Set of socketIds
const socketUsers = new Map(); // socketId -> userId

// Call tracking
const activeCallByUser = new Map(); // userId -> callId
const activeCallById = new Map(); // callId -> { chatId, from, to, type, startedAt }

function hasAnySocket(userId) {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
}

async function safeCallLogMessage({
  chatId,
  senderId,
  callId,
  callType,
  callEvent,
  durationSec,
  content,
}) {
  if (!chatId || !senderId) return null;
  const text = String(content || "").trim() || "Call";
  try {
    return await MessageService.createMessage(chatId, senderId, {
      type: MESSAGE_TYPE.CALL,
      content: text,
      meta: {
        callId: String(callId || ""),
        callType: String(callType || ""),
        callEvent: String(callEvent || ""),
        callDurationSec:
          typeof durationSec === "number" ? durationSec : undefined,
      },
    });
  } catch (e) {
    logger.error("Failed to create call log message:", e?.message || e);
    return null;
  }
}

class SocketService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize Socket.IO
   */
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify token
        const payload = AuthService.verifyAccessToken(token);
        const user = await AuthService.getUserById(payload.userId);

        // Attach user to socket
        socket.userId = user._id.toString();
        socket.user = user;

        next();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Socket authentication error: ${errorMsg}`);
        next(new Error("Authentication failed"));
      }
    });

    // Connection event
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
      this.handleConnection(socket);
    });

    logger.info("Socket.IO initialized");
    return this.io;
  }

  /**
   * Handle new socket connection
   */
  async handleConnection(socket) {
    const userId = socket.userId;
    logger.info(`User connected: ${userId} (Socket: ${socket.id})`);

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    socketUsers.set(socket.id, userId);

    // Update user online status
    await UserService.updateOnlineStatus(userId, true);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Emit user online to contacts (broadcast to all connected users for now)
    socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId,
      timestamp: new Date(),
    });

    // Event: Join chat rooms
    socket.on(SOCKET_EVENTS.JOIN_CHATS, async (data) => {
      await this.handleJoinChats(socket, data);
    });

    // Event: Send message
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Event: Typing indicator
    socket.on(SOCKET_EVENTS.TYPING, (data) => {
      this.handleTyping(socket, data);
    });

    // Event: Stop typing
    socket.on(SOCKET_EVENTS.STOP_TYPING, (data) => {
      this.handleStopTyping(socket, data);
    });

    // Event: Message seen
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, async (data) => {
      await this.handleMessageSeen(socket, data);
    });

    // Event: Message delivered
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async (data) => {
      await this.handleMessageDelivered(socket, data);
    });

    // Event: Message reaction
    socket.on(SOCKET_EVENTS.MESSAGE_REACTION, async (data) => {
      await this.handleMessageReaction(socket, data);
    });

    // Calls
    socket.on(SOCKET_EVENTS.CALL_INITIATE, async (data) => {
      await this.handleCallInitiate(socket, data);
    });
    socket.on(SOCKET_EVENTS.CALL_ACCEPT, async (data) => {
      await this.handleCallAccept(socket, data);
    });
    socket.on(SOCKET_EVENTS.CALL_DECLINE, async (data) => {
      await this.handleCallDecline(socket, data);
    });
    socket.on(SOCKET_EVENTS.CALL_END, async (data) => {
      await this.handleCallEnd(socket, data);
    });
    socket.on(SOCKET_EVENTS.CALL_SIGNAL, async (data) => {
      await this.handleCallSignal(socket, data);
    });

    // Event: Disconnect
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      await this.handleDisconnect(socket);
    });
  }

  async handleCallInitiate(socket, data) {
    try {
      const { callId, chatId, to, type } = data || {};
      if (!callId || !chatId || !to || !type) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "callId, chatId, to and type are required",
        });
      }

      if (config.nodeEnv === "development") {
        logger.info(
          `[call] initiate from=${socket.userId} to=${String(
            to
          )} chatId=${String(chatId)} type=${String(type)} callId=${String(
            callId
          )}`
        );
      }

      // Validate chat access and 1:1
      const chat = await ChatService.getChatById(chatId, socket.userId);
      if (!chat || chat.isGroup) throw new Error("Only 1-to-1 calls supported");

      const participants = (chat.participants || []).map((p) =>
        typeof p === "string" ? p : p?._id?.toString?.()
      );
      const otherId = participants.find((id) => id && id !== socket.userId);
      if (!otherId) throw new Error("Invalid chat participants");
      if (String(to) !== String(otherId)) throw new Error("Invalid callee");
      if (String(to) === String(socket.userId)) {
        throw new Error("Cannot call yourself");
      }

      // Busy check
      if (
        activeCallByUser.has(socket.userId) ||
        activeCallByUser.has(String(to))
      ) {
        socket.emit(SOCKET_EVENTS.CALL_BUSY, {
          callId,
          chatId,
          to: String(to),
          timestamp: new Date(),
        });
        return;
      }

      // Offline/unavailable
      if (!hasAnySocket(String(to))) {
        if (config.nodeEnv === "development") {
          logger.info(
            `[call] callee offline/unavailable to=${String(to)} callId=${String(
              callId
            )}`
          );
        }
        socket.emit(SOCKET_EVENTS.CALL_UNAVAILABLE, {
          callId,
          chatId,
          to: String(to),
          timestamp: new Date(),
        });

        // Log missed call
        const msg = await safeCallLogMessage({
          chatId,
          senderId: socket.userId,
          callId,
          callType: type,
          callEvent: "missed",
          content:
            type === "video" ? "❌ Missed video call" : "❌ Missed voice call",
        });
        if (msg)
          this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, msg);
        return;
      }

      // Track active call
      activeCallByUser.set(socket.userId, String(callId));
      activeCallByUser.set(String(to), String(callId));
      activeCallById.set(String(callId), {
        chatId: String(chatId),
        from: socket.userId,
        to: String(to),
        type: String(type),
        startedAt: Date.now(),
      });

      // Notify caller (ringing)
      socket.emit(SOCKET_EVENTS.CALL_RINGING, {
        callId: String(callId),
        chatId: String(chatId),
        to: String(to),
        type: String(type),
        timestamp: new Date(),
      });

      // Notify callee (incoming)
      if (config.nodeEnv === "development") {
        const count = userSockets.get(String(to))?.size || 0;
        logger.info(
          `[call] emitting incoming to=${String(
            to
          )} sockets=${count} callId=${String(callId)}`
        );
      }
      this.emitToUser(String(to), SOCKET_EVENTS.CALL_INCOMING, {
        callId: String(callId),
        chatId: String(chatId),
        from: socket.userId,
        type: String(type),
        timestamp: new Date(),
      });

      // Log outgoing call (chat message)
      const msg = await safeCallLogMessage({
        chatId,
        senderId: socket.userId,
        callId,
        callType: type,
        callEvent: "outgoing",
        content:
          type === "video"
            ? "📞 Outgoing video call"
            : "📞 Outgoing voice call",
      });
      if (msg)
        this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, msg);
    } catch (error) {
      logger.error("Error in handleCallInitiate:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  async handleCallAccept(socket, data) {
    try {
      const { callId, chatId } = data || {};
      if (!callId || !chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "callId and chatId are required",
        });
      }

      const call = activeCallById.get(String(callId));
      if (!call || call.chatId !== String(chatId)) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: "Call not found" });
      }

      // Only callee can accept
      if (String(call.to) !== String(socket.userId)) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: "Unauthorized" });
      }

      this.emitToUser(String(call.from), SOCKET_EVENTS.CALL_ACCEPTED, {
        callId: String(callId),
        chatId: String(chatId),
        from: String(call.to),
        timestamp: new Date(),
      });

      // Log accepted as a call event (optional; keep minimal)
    } catch (error) {
      logger.error("Error in handleCallAccept:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  async handleCallDecline(socket, data) {
    try {
      const { callId, chatId } = data || {};
      if (!callId || !chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "callId and chatId are required",
        });
      }

      const call = activeCallById.get(String(callId));
      if (!call || call.chatId !== String(chatId)) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: "Call not found" });
      }

      // Only participants can decline
      if (
        String(socket.userId) !== String(call.from) &&
        String(socket.userId) !== String(call.to)
      ) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: "Unauthorized" });
      }

      const other =
        String(socket.userId) === String(call.from) ? call.to : call.from;

      this.emitToUser(String(other), SOCKET_EVENTS.CALL_DECLINED, {
        callId: String(callId),
        chatId: String(chatId),
        by: String(socket.userId),
        timestamp: new Date(),
      });

      // Cleanup
      activeCallById.delete(String(callId));
      activeCallByUser.delete(String(call.from));
      activeCallByUser.delete(String(call.to));

      // Log declined
      const msg = await safeCallLogMessage({
        chatId,
        senderId: socket.userId,
        callId,
        callType: call.type,
        callEvent: "declined",
        content: "🚫 Call declined",
      });
      if (msg)
        this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, msg);
    } catch (error) {
      logger.error("Error in handleCallDecline:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  async handleCallEnd(socket, data) {
    try {
      const { callId, chatId, durationSec } = data || {};
      if (!callId || !chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "callId and chatId are required",
        });
      }

      const call = activeCallById.get(String(callId));
      if (!call || call.chatId !== String(chatId)) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: "Call not found" });
      }

      // Only participants can end
      if (
        String(socket.userId) !== String(call.from) &&
        String(socket.userId) !== String(call.to)
      ) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: "Unauthorized" });
      }

      const other =
        String(socket.userId) === String(call.from) ? call.to : call.from;

      this.emitToUser(String(other), SOCKET_EVENTS.CALL_ENDED, {
        callId: String(callId),
        chatId: String(chatId),
        by: String(socket.userId),
        durationSec: typeof durationSec === "number" ? durationSec : undefined,
        timestamp: new Date(),
      });

      // Cleanup
      activeCallById.delete(String(callId));
      activeCallByUser.delete(String(call.from));
      activeCallByUser.delete(String(call.to));

      // Log ended
      const dur =
        typeof durationSec === "number" && durationSec > 0
          ? durationSec
          : undefined;
      const mm = dur ? String(Math.floor(dur / 60)).padStart(2, "0") : null;
      const ss = dur ? String(Math.floor(dur % 60)).padStart(2, "0") : null;
      const tail = mm && ss ? ` • ${mm}:${ss}` : "";
      const msg = await safeCallLogMessage({
        chatId,
        senderId: socket.userId,
        callId,
        callType: call.type,
        callEvent: "ended",
        durationSec: dur,
        content: `📞 Call ended${tail}`,
      });
      if (msg)
        this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, msg);
    } catch (error) {
      logger.error("Error in handleCallEnd:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  async handleCallSignal(socket, data) {
    try {
      const { callId, to, payload } = data || {};
      if (!callId || !to || !payload) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "callId, to and payload are required",
        });
      }
      const call = activeCallById.get(String(callId));
      if (!call) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: "Call not found" });
      }
      // Forward signaling
      this.emitToUser(String(to), SOCKET_EVENTS.CALL_SIGNAL, {
        callId: String(callId),
        from: String(socket.userId),
        payload,
      });
    } catch (error) {
      logger.error("Error in handleCallSignal:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle joining chat rooms
   */
  async handleJoinChats(socket, data) {
    try {
      const { chatIds } = data;

      if (!Array.isArray(chatIds)) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatIds must be an array",
        });
      }

      // Verify user has access to each chat and join rooms
      for (const chatId of chatIds) {
        try {
          const chat = await ChatService.getChatById(chatId, socket.userId);
          socket.join(`chat:${chatId}`);
          logger.info(`User ${socket.userId} joined chat room: ${chatId}`);
        } catch (error) {
          logger.error(`Error joining chat ${chatId}:`, error.message);
        }
      }
    } catch (error) {
      logger.error("Error in handleJoinChats:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle sending message
   */
  async handleSendMessage(socket, data) {
    try {
      const { chatId, type = "text", content, meta } = data;

      if (!chatId || !content) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatId and content are required",
        });
      }

      // Create message
      const message = await MessageService.createMessage(
        chatId,
        socket.userId,
        {
          type,
          content,
          meta,
        }
      );

      // Emit to all participants in the chat room
      this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, message);

      logger.info(`Message sent in chat ${chatId} by user ${socket.userId}`);
    } catch (error) {
      logger.error("Error in handleSendMessage:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle message reaction toggle
   */
  async handleMessageReaction(socket, data) {
    try {
      const { chatId, messageId, emoji } = data || {};
      if (!chatId || !messageId || !emoji) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatId, messageId and emoji are required",
        });
      }

      const message = await MessageService.toggleReaction(
        messageId,
        socket.userId,
        emoji
      );

      this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.MESSAGE_REACTION, {
        chatId,
        messageId,
        reactions: message.reactions || [],
      });
    } catch (error) {
      logger.error("Error in handleMessageReaction:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle typing indicator
   */
  handleTyping(socket, data) {
    try {
      const { chatId, isTyping } = data;

      if (!chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatId is required",
        });
      }

      // Broadcast to other participants in the chat
      socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.TYPING, {
        chatId,
        userId: socket.userId,
        username: socket.user.username,
        isTyping: isTyping !== false,
      });
    } catch (error) {
      logger.error("Error in handleTyping:", error);
    }
  }

  /**
   * Handle stop typing
   */
  handleStopTyping(socket, data) {
    try {
      const { chatId } = data;

      if (!chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatId is required",
        });
      }

      socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.STOP_TYPING, {
        chatId,
        userId: socket.userId,
        username: socket.user.username,
      });
    } catch (error) {
      logger.error("Error in handleStopTyping:", error);
    }
  }

  /**
   * Handle message seen
   */
  async handleMessageSeen(socket, data) {
    try {
      const { messageId, chatId } = data;

      if (!messageId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "messageId is required",
        });
      }

      // Update message status
      const message = await MessageService.updateMessageStatus(
        messageId,
        socket.userId,
        MESSAGE_STATUS.SEEN
      );

      // Emit to all participants
      this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.MESSAGE_SEEN, {
        messageId,
        chatId,
        userId: socket.userId,
        seenAt: message.seenAt,
      });

      logger.info(
        `Message ${messageId} marked as seen by user ${socket.userId}`
      );
    } catch (error) {
      logger.error("Error in handleMessageSeen:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle message delivered
   */
  async handleMessageDelivered(socket, data) {
    try {
      const { messageId, chatId } = data;

      if (!messageId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "messageId is required",
        });
      }

      if (!chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatId is required",
        });
      }

      const message = await MessageService.updateMessageStatus(
        messageId,
        socket.userId,
        MESSAGE_STATUS.DELIVERED
      );

      this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
        messageId,
        chatId,
        userId: socket.userId,
        deliveredAt: message.deliveredAt,
      });

      logger.info(
        `Message ${messageId} marked as delivered by user ${socket.userId}`
      );
    } catch (error) {
      logger.error("Error in handleMessageDelivered:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle disconnect
   */
  async handleDisconnect(socket) {
    const userId = socket.userId;
    logger.info(`User disconnected: ${userId} (Socket: ${socket.id})`);

    // Remove socket from tracking
    if (userSockets.has(userId)) {
      userSockets.get(userId).delete(socket.id);

      // If user has no more active sockets, mark as offline
      if (userSockets.get(userId).size === 0) {
        userSockets.delete(userId);

        // If user had an active call, notify the other side and cleanup.
        const activeCallId = activeCallByUser.get(userId);
        if (activeCallId) {
          const call = activeCallById.get(String(activeCallId));
          if (call) {
            const other =
              String(userId) === String(call.from) ? call.to : call.from;
            this.emitToUser(String(other), SOCKET_EVENTS.CALL_ENDED, {
              callId: String(activeCallId),
              chatId: String(call.chatId),
              by: String(userId),
              timestamp: new Date(),
            });
            activeCallById.delete(String(activeCallId));
            activeCallByUser.delete(String(call.from));
            activeCallByUser.delete(String(call.to));
          } else {
            activeCallByUser.delete(userId);
          }
        }

        // Update user offline status
        await UserService.updateOnlineStatus(userId, false);

        // Emit user offline
        socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
          userId,
          lastSeenAt: new Date(),
        });
      }
    }

    socketUsers.delete(socket.id);
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId, event, data) {
    if (userSockets.has(userId)) {
      const sockets = userSockets.get(userId);
      sockets.forEach((socketId) => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Emit event to chat room
   */
  emitToChat(chatId, event, data) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    if (!this.io) {
      throw new Error("Socket.IO not initialized");
    }
    return this.io;
  }
}

// Export singleton instance
module.exports = new SocketService();
