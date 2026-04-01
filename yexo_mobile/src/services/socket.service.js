import { io } from "socket.io-client";
import { SOCKET_URL } from "../constants/endpoints";
import storageService from "./storage.service";

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  // Connect to socket server
  async connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Get token from storage for socket authentication
    const token = await storageService.getToken();

    if (!token) {
      console.error("No token found, cannot connect socket");
      return null;
    }

    // Pass token in auth object for Socket.IO authentication
    this.socket = io(SOCKET_URL, {
      auth: { token }, // Pass token for backend authentication
      withCredentials: true, // Also send cookies
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id);
      this.connected = true;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      this.connected = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Send message
  sendMessage(data) {
    if (this.socket?.connected) {
      console.log("=== SENDING MESSAGE VIA SOCKET ===");
      console.log("Message data:", JSON.stringify(data, null, 2));
      this.socket.emit("send_message", data);
    } else {
      console.error("Cannot send message - socket not connected");
    }
  }

  // Emit typing event
  typing(chatId, isTyping) {
    if (this.socket?.connected) {
      this.socket.emit("typing", { chatId, isTyping });
    }
  }

  // Mark message as seen
  markMessageSeen(messageId, chatId) {
    if (this.socket?.connected) {
      this.socket.emit("message_seen", { messageId, chatId });
    }
  }

  // Join chat room
  joinChat(chatId) {
    if (this.socket?.connected) {
      this.socket.emit("join_chat", { chatId });
    }
  }

  // Leave chat room
  leaveChat(chatId) {
    if (this.socket?.connected) {
      this.socket.emit("leave_chat", { chatId });
    }
  }

  // Listen for message sent confirmation (for sender)
  onMessageSent(callback) {
    if (this.socket) {
      this.socket.off("message_sent");
      this.socket.on("message_sent", (data) => {
        console.log("Socket received message_sent event:", data);
        callback(data);
      });
    }
  }

  // Listen for new messages (for receiver)
  onNewMessage(callback) {
    if (this.socket) {
      // Remove existing listener to avoid duplicates
      this.socket.off("new_message");
      this.socket.on("new_message", (message) => {
        console.log("Socket received new_message event:", message);
        callback(message);
      });
    }
  }

  // Listen for message seen
  onMessageSeen(callback) {
    if (this.socket) {
      this.socket.off("message_seen");
      this.socket.on("message_seen", callback);
    }
  }

  // Listen for message delivered
  onMessageDelivered(callback) {
    if (this.socket) {
      this.socket.off("message_delivered");
      this.socket.on("message_delivered", callback);
    }
  }

  // Listen for typing
  onTyping(callback) {
    if (this.socket) {
      this.socket.off("typing");
      this.socket.on("typing", callback);
    }
  }

  // Listen for user online
  onUserOnline(callback) {
    if (this.socket) {
      this.socket.off("user_online");
      this.socket.on("user_online", callback);
    }
  }

  // Listen for user offline
  onUserOffline(callback) {
    if (this.socket) {
      this.socket.off("user_offline");
      this.socket.on("user_offline", callback);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Remove specific listener
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check if connected
  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

export default new SocketService();
