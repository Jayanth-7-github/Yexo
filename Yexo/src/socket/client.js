import { io } from "socket.io-client";
import { getAccessToken } from "../utils/authTokens";
import { getApiBaseUrl } from "../api/http";

/**
 * Backend expects token in socket.handshake.auth.token (or query.token).
 */
export function createSocketClient(options = {}) {
  return io(getApiBaseUrl(), {
    autoConnect: false,
    // Use a callback so reconnects always send the latest token.
    auth: (cb) => cb({ token: getAccessToken() }),
    ...options,
  });
}
