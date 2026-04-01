import { useState, useEffect } from "react";
import { useMessageStore } from "../store/message.store";

export const useMessages = (chatId) => {
  const {
    getMessages,
    loadMessages,
    addMessage,
    updateMessage,
    updateMessageStatus,
    markAsSeen,
    markAllAsSeen,
    isLoading,
    hasMore,
  } = useMessageStore();

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    setMessages(getMessages(chatId));
  }, [chatId, getMessages]);

  const loadMore = async () => {
    if (hasMore[chatId]) {
      const currentPage = useMessageStore.getState().currentPage[chatId] || 1;
      await loadMessages(chatId, currentPage + 1);
    }
  };

  return {
    messages,
    isLoading,
    hasMore: hasMore[chatId],
    loadMore,
    addMessage: (message) => addMessage(chatId, message),
    updateMessage: (messageId, updates) =>
      updateMessage(chatId, messageId, updates),
    updateMessageStatus: (messageId, status) =>
      updateMessageStatus(chatId, messageId, status),
    markAsSeen: (messageId) => markAsSeen(chatId, messageId),
    markAllAsSeen: () => markAllAsSeen(chatId),
  };
};
