import { http } from "./http";

export async function getUserChats({ page = 1, limit = 20 } = {}) {
  const res = await http.get("/api/chats", { params: { page, limit } });
  return res.data; // { success, message, data: Chat[] }
}

export async function createOrGetChat(userId) {
  const res = await http.post("/api/chats", { userId });
  return res.data; // { success, message, data: Chat }
}

export async function getChatById(chatId) {
  const res = await http.get(`/api/chats/${chatId}`);
  return res.data;
}

export async function deleteChat(chatId) {
  const res = await http.delete(`/api/chats/${chatId}`);
  return res.data;
}
