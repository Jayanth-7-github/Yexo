import { useEffect } from "react";
import { useSocketStore } from "../store/socket.store";

export const useSocket = () => {
  const {
    socket,
    connected,
    initSocket,
    sendMessage,
    typing,
    markMessageSeen,
    joinChat,
    leaveChat,
    disconnect,
  } = useSocketStore();

  useEffect(() => {
    initSocket();

    return () => {
      disconnect();
    };
  }, []);

  return {
    socket,
    connected,
    sendMessage,
    typing,
    markMessageSeen,
    joinChat,
    leaveChat,
  };
};
