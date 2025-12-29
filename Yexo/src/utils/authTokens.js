const ACCESS_KEY = "yexo.accessToken";
const REFRESH_KEY = "yexo.refreshToken";

export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens({ accessToken, refreshToken }) {
  try {
    if (typeof accessToken === "string")
      localStorage.setItem(ACCESS_KEY, accessToken);
    if (typeof refreshToken === "string")
      localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    // ignore
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}
