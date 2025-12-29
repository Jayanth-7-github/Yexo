import { http } from "./http";

export async function getChatMessages(
  chatId,
  { page = 1, limit = 20, before } = {}
) {
  const res = await http.get(`/api/messages/${chatId}`, {
    params: {
      page,
      limit,
      before: before || undefined,
    },
  });
  return res.data; // { success, message, data: Message[] }
}

export async function sendMessage(
  chatId,
  { type = "text", content, meta } = {}
) {
  const res = await http.post(`/api/messages/${chatId}`, {
    type,
    content,
    meta: meta || undefined,
  });
  return res.data; // { success, message, data: Message }
}

export async function updateMessageStatus(messageId, status) {
  const res = await http.patch(`/api/messages/${messageId}/status`, { status });
  return res.data;
}

export async function deleteMessage(messageId) {
  const res = await http.delete(`/api/messages/${messageId}`);
  return res.data;
}

export async function uploadMedia(file) {
  const form = new FormData();
  form.append("file", file);

  const res = await http.post(`/api/messages/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { success, message, data: { fileName,fileUrl,fileSize,mimeType,type } }
}

export async function toggleReaction(messageId, emoji) {
  const res = await http.patch(`/api/messages/${messageId}/reaction`, {
    emoji,
  });
  return res.data; // { success, message, data: Message }
}
