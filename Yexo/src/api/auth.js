import { http } from "./http";

export async function loginApi({ username, password }) {
  const res = await http.post("/api/auth/login", { username, password });
  return res.data; // { success, message, data: { user, accessToken, refreshToken } }
}

export async function registerApi({ username, password, email, phoneNumber }) {
  const res = await http.post("/api/auth/register", {
    username,
    password,
    email: email || undefined,
    phoneNumber: phoneNumber || undefined,
  });
  return res.data;
}

export async function meApi() {
  const res = await http.get("/api/auth/me");
  return res.data; // { success, message, data: user }
}

export async function logoutApi(refreshToken) {
  const res = await http.post("/api/auth/logout", { refreshToken });
  return res.data;
}
