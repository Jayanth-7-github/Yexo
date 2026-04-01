// Format message text (truncate, etc.)
export const truncateMessage = (text, maxLength = 50) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Get message preview
export const getMessagePreview = (message) => {
  if (!message) return "No messages yet";

  switch (message.type) {
    case "text":
      return truncateMessage(message.content || "New message");
    case "image":
      return "📷 Photo";
    case "video":
      return "🎥 Video";
    case "audio":
      return "🎤 Audio";
    case "file":
      return "📎 File";
    default:
      return "New message";
  }
};

// Get chat name
export const getChatName = (chat, currentUserId) => {
  if (chat.type === "group") {
    return chat.name || "Group Chat";
  }

  // Direct chat - get other user's name
  const otherUser = chat.participants?.find((p) => p._id !== currentUserId);
  return otherUser?.username || otherUser?.name || "Unknown User";
};

// Get chat avatar
export const getChatAvatar = (chat, currentUserId) => {
  if (chat.type === "group") {
    return chat.avatar || null;
  }

  // Direct chat - get other user's avatar
  const otherUser = chat.participants?.find((p) => p._id !== currentUserId);
  return otherUser?.avatar || null;
};

// Check if user is online
export const isUserOnline = (chat, currentUserId) => {
  if (chat.type === "group") {
    return false;
  }

  const otherUser = chat.participants?.find((p) => p._id !== currentUserId);
  return otherUser?.isOnline || false;
};
