import { http } from "./http";

export async function searchUsers(q, { limit = 10 } = {}) {
  const query = String(q || "").trim();
  if (!query) return { success: true, data: [] };
  const res = await http.get("/api/users/search", {
    params: { q: query, limit },
  });
  return res.data; // { success, message, data: User[] }
}

export async function getUserProfile(userId) {
  if (!userId) throw new Error("userId is required");
  const res = await http.get(`/api/users/${userId}`);
  return res.data; // { success, message, data: User }
}

export async function getMyProfile() {
  const res = await http.get("/api/users/me");
  return res.data; // { success, message, data: User }
}
