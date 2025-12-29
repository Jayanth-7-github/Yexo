import { create } from "zustand";
import { createOrGetChat, getChatById, getUserChats } from "../api/chats";
import { createGroup as createGroupApi } from "../api/groups";
import {
  getChatMessages,
  sendMessage as sendMessageApi,
  deleteMessage as deleteMessageApi,
  uploadMedia as uploadMediaApi,
  toggleReaction as toggleReactionApi,
  updateMessageStatus as updateMessageStatusApi,
} from "../api/messages";
import { useAuthStore } from "./authStore";
import { createSocketClient } from "../socket/client";

const SOCKET_EVENTS = {
  JOIN_CHATS: "join_chats",
  SEND_MESSAGE: "send_message",
  NEW_MESSAGE: "new_message",
  MESSAGE_DELIVERED: "message_delivered",
  MESSAGE_SEEN: "message_seen",
  MESSAGE_REACTION: "message_reaction",
  TYPING: "typing",
  STOP_TYPING: "stop_typing",
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",

  // Calls (WebRTC signaling)
  CALL_INITIATE: "call:initiate",
  CALL_INCOMING: "call:incoming",
  CALL_RINGING: "call:ringing",
  CALL_ACCEPT: "call:accept",
  CALL_ACCEPTED: "call:accepted",
  CALL_DECLINE: "call:decline",
  CALL_DECLINED: "call:declined",
  CALL_END: "call:end",
  CALL_ENDED: "call:ended",
  CALL_BUSY: "call:busy",
  CALL_UNAVAILABLE: "call:unavailable",
  CALL_SIGNAL: "call:signal",

  ERROR: "error",
};

function makeCallId() {
  try {
    if (typeof crypto !== "undefined" && crypto?.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `call_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function stopStream(stream) {
  try {
    (stream?.getTracks?.() || []).forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
}

function createPeerConnection() {
  return new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
}

function getOtherParticipantId(chat, myId) {
  const parts = Array.isArray(chat?.participants) ? chat.participants : [];
  const other = parts.find((p) => {
    const id = typeof p === "string" ? p : p?._id;
    return id && myId ? id !== myId : !!id;
  });
  return typeof other === "string" ? other : other?._id || null;
}

function extractMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    "Something went wrong"
  );
}

function uniqById(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const id = it?._id;
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(it);
  }
  return out;
}

function upsertChat(list, chat) {
  const items = Array.isArray(list) ? list : [];
  if (!chat?._id) return items;
  const idx = items.findIndex((c) => c?._id === chat._id);
  if (idx === -1) return [chat, ...items];
  const next = items.slice();
  next[idx] = { ...items[idx], ...chat };
  return next;
}

function getSenderId(message) {
  if (!message) return null;
  if (typeof message.sender === "string") return message.sender;
  return message.sender?._id || null;
}

function patchMessageInChat(messagesByChat, chatId, messageId, patch) {
  const entry = messagesByChat?.[chatId];
  const items = entry?.items;
  if (!Array.isArray(items) || !items.length) return messagesByChat;
  const idx = items.findIndex((m) => m?._id === messageId);
  if (idx === -1) return messagesByChat;
  const nextItems = items.slice();
  nextItems[idx] = { ...nextItems[idx], ...patch };
  return {
    ...messagesByChat,
    [chatId]: { ...entry, items: nextItems },
  };
}

function patchMessageByPredicate(messagesByChat, chatId, predicate, patch) {
  const entry = messagesByChat?.[chatId];
  const items = entry?.items;
  if (!Array.isArray(items) || !items.length) return messagesByChat;
  const idx = items.findIndex(predicate);
  if (idx === -1) return messagesByChat;
  const nextItems = items.slice();
  nextItems[idx] = { ...nextItems[idx], ...patch };
  return {
    ...messagesByChat,
    [chatId]: { ...entry, items: nextItems },
  };
}

function getMessageTypeFromMime(mimeType) {
  const mt = String(mimeType || "").toLowerCase();
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";
  if (mt.startsWith("audio/")) return "audio";
  return "file";
}

export const useChatStore = create((set, get) => ({
  chats: [],
  chatsLoading: false,
  chatsError: null,

  selectedChatId: null,

  // chatId -> { items, loading, error }
  messagesByChat: {},

  // Realtime
  socket: null,
  realtimeConnected: false,
  realtimeError: null,
  presenceByUser: {}, // userId -> boolean
  typingByChat: {}, // chatId -> { userId, username, isTyping }
  _typingTimeouts: {}, // chatId -> timeoutId

  // Calls
  activeCall: null, // { callId, chatId, from, to, type, state, startedAt, connectedAt }
  callError: null,
  localStream: null,
  remoteStream: null,
  micMuted: false,
  camOff: false,
  remoteCamOff: false,

  startRealtime: () => {
    const existing = get().socket;
    if (existing) {
      if (!existing.connected) existing.connect();
      return;
    }

    const socket = createSocketClient();

    socket.on("connect", () => {
      set({ realtimeConnected: true, realtimeError: null });
      // Join all chats we already have.
      const ids = (get().chats || []).map((c) => c?._id).filter(Boolean);
      if (ids.length) socket.emit(SOCKET_EVENTS.JOIN_CHATS, { chatIds: ids });
    });

    socket.on("disconnect", () => {
      set({ realtimeConnected: false });
    });

    socket.on("connect_error", (err) => {
      set({ realtimeConnected: false, realtimeError: extractMessage(err) });
    });

    socket.on(SOCKET_EVENTS.ERROR, (payload) => {
      const message = payload?.message || payload?.error || "Socket error";
      set({ realtimeError: String(message) });
    });

    socket.on(SOCKET_EVENTS.USER_ONLINE, (payload) => {
      const userId = payload?.userId;
      if (!userId) return;
      set((s) => ({ presenceByUser: { ...s.presenceByUser, [userId]: true } }));
    });

    socket.on(SOCKET_EVENTS.USER_OFFLINE, (payload) => {
      const userId = payload?.userId;
      if (!userId) return;
      set((s) => ({
        presenceByUser: { ...s.presenceByUser, [userId]: false },
      }));
    });

    socket.on(SOCKET_EVENTS.TYPING, (payload) => {
      const chatId = payload?.chatId;
      if (!chatId) return;
      set((s) => ({
        typingByChat: {
          ...s.typingByChat,
          [chatId]: {
            userId: payload?.userId,
            username: payload?.username,
            isTyping: payload?.isTyping !== false,
          },
        },
      }));
    });

    socket.on(SOCKET_EVENTS.STOP_TYPING, (payload) => {
      const chatId = payload?.chatId;
      if (!chatId) return;
      set((s) => {
        const next = { ...s.typingByChat };
        delete next[chatId];
        return { typingByChat: next };
      });
    });

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (message) => {
      const chatId = message?.chat;
      if (!chatId) return;

      const myId = useAuthStore.getState()?.user?._id;
      const senderId = getSenderId(message);

      // Append message
      set((s) => {
        const existing = s.messagesByChat[chatId]?.items || [];
        const clientId = message?.meta?.clientId;
        let nextItems = existing;
        if (clientId) {
          let replaced = false;
          nextItems = existing.map((m) => {
            const mClientId = m?.meta?.clientId;
            if (m?._id === clientId || mClientId === clientId) {
              replaced = true;
              return message;
            }
            return m;
          });
          if (!replaced) nextItems = [...existing, message];
        } else if (myId && senderId && senderId === myId) {
          // Backend may not persist meta.clientId; replace our last optimistic bubble.
          const content = String(message?.content || "").trim();
          const type = message?.type || "text";
          const idx = (() => {
            for (let i = existing.length - 1; i >= 0; i -= 1) {
              const m = existing[i];
              if (!m?._optimistic) continue;
              const mSenderId = getSenderId(m);
              if (mSenderId && mSenderId !== myId) continue;
              const mType = m?.type || "text";
              const mContent = String(m?.content || "").trim();
              if (mType === type && mContent === content) return i;
            }
            return -1;
          })();

          if (idx >= 0) {
            nextItems = existing.slice();
            nextItems[idx] = message;
          } else {
            nextItems = [...existing, message];
          }
        } else {
          nextItems = [...existing, message];
        }
        const merged = uniqById(nextItems);
        return {
          messagesByChat: {
            ...s.messagesByChat,
            [chatId]: {
              items: merged,
              loading: false,
              error: null,
            },
          },
          chats: (s.chats || []).map((c) =>
            c._id === chatId
              ? {
                  ...c,
                  lastMessage: message,
                  updatedAt: message.createdAt || c.updatedAt,
                }
              : c
          ),
        };
      });

      // Mark as delivered if it's not mine.
      if (myId && senderId && senderId !== myId && message?._id) {
        get().emitDelivered(chatId, message._id);
        if (get().selectedChatId === chatId) {
          get().emitSeen(chatId, message._id);
        }
      }
    });

    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, (payload) => {
      const chatId = payload?.chatId;
      const messageId = payload?.messageId;
      if (!chatId || !messageId) return;
      set((s) => ({
        messagesByChat: patchMessageInChat(
          s.messagesByChat,
          chatId,
          messageId,
          {
            status: "delivered",
            deliveredAt: payload?.deliveredAt || new Date().toISOString(),
          }
        ),
      }));
    });

    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, (payload) => {
      const chatId = payload?.chatId;
      const messageId = payload?.messageId;
      if (!chatId || !messageId) return;
      set((s) => ({
        messagesByChat: patchMessageInChat(
          s.messagesByChat,
          chatId,
          messageId,
          {
            status: "seen",
            seenAt: payload?.seenAt || new Date().toISOString(),
          }
        ),
      }));
    });

    socket.on(SOCKET_EVENTS.MESSAGE_REACTION, (payload) => {
      const chatId = payload?.chatId;
      const messageId = payload?.messageId;
      if (!chatId || !messageId) return;
      set((s) => ({
        messagesByChat: patchMessageInChat(
          s.messagesByChat,
          chatId,
          messageId,
          { reactions: payload?.reactions || [] }
        ),
      }));
    });

    // Call events
    socket.on(SOCKET_EVENTS.CALL_INCOMING, (payload) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[call] incoming", payload);
      }
      const { callId, chatId, from, type } = payload || {};
      if (!callId || !chatId || !from) return;
      const myId = useAuthStore.getState()?.user?._id;
      set({
        activeCall: {
          callId,
          chatId,
          from,
          to: myId || null,
          type: type === "video" ? "video" : "audio",
          state: "incoming",
          startedAt: Date.now(),
          connectedAt: null,
        },
        callError: null,
        remoteCamOff: false,
      });
    });

    socket.on(SOCKET_EVENTS.CALL_RINGING, (payload) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[call] ringing", payload);
      }
      const { callId } = payload || {};
      if (!callId) return;
      set((s) => {
        if (!s.activeCall || s.activeCall.callId !== callId) return {};
        return { activeCall: { ...s.activeCall, state: "outgoing" } };
      });
    });

    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, async (payload) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[call] accepted", payload);
      }
      const { callId } = payload || {};
      if (!callId) return;

      const state = get();
      if (!state.activeCall || state.activeCall.callId !== callId) return;
      set((s) => ({
        activeCall: { ...s.activeCall, state: "connecting" },
        callError: null,
      }));

      // Caller creates offer
      try {
        const pc = state._pc;
        if (!pc) throw new Error("PeerConnection not ready");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
          callId,
          to: state.activeCall.to,
          payload: { kind: "offer", sdp: pc.localDescription },
        });
      } catch (err) {
        set({ callError: extractMessage(err) });
      }
    });

    socket.on(SOCKET_EVENTS.CALL_DECLINED, (payload) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[call] declined", payload);
      }
      const { callId } = payload || {};
      if (!callId) return;
      set((s) => {
        if (!s.activeCall || s.activeCall.callId !== callId) return {};
        return {
          activeCall: { ...s.activeCall, state: "ended" },
          callError: "Call declined",
        };
      });
      get()._cleanupCallResources();
    });

    socket.on(SOCKET_EVENTS.CALL_ENDED, (payload) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[call] ended", payload);
      }
      const { callId } = payload || {};
      if (!callId) return;
      set((s) => {
        if (!s.activeCall || s.activeCall.callId !== callId) return {};
        return { activeCall: { ...s.activeCall, state: "ended" } };
      });
      get()._cleanupCallResources();
    });

    socket.on(SOCKET_EVENTS.CALL_BUSY, (payload) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[call] busy", payload);
      }
      const { callId } = payload || {};
      if (!callId) return;
      set((s) => {
        if (!s.activeCall || s.activeCall.callId !== callId) return {};
        return {
          activeCall: { ...s.activeCall, state: "ended" },
          callError: "User busy",
        };
      });
      get()._cleanupCallResources();
    });

    socket.on(SOCKET_EVENTS.CALL_UNAVAILABLE, (payload) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[call] unavailable", payload);
      }
      const { callId } = payload || {};
      if (!callId) return;
      set((s) => {
        if (!s.activeCall || s.activeCall.callId !== callId) return {};
        return {
          activeCall: { ...s.activeCall, state: "ended" },
          callError: "User unavailable",
        };
      });
      get()._cleanupCallResources();
    });

    socket.on(SOCKET_EVENTS.CALL_SIGNAL, async (payload) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        const kind = payload?.payload?.kind;
        console.debug("[call] signal", kind, payload);
      }
      const { callId, payload: sig } = payload || {};
      if (!callId || !sig) return;
      const state = get();
      if (!state.activeCall || state.activeCall.callId !== callId) return;
      const pc = state._pc;
      if (!pc) return;

      try {
        if (sig.kind === "media") {
          const videoEnabled = sig?.videoEnabled;
          if (typeof videoEnabled === "boolean") {
            set({ remoteCamOff: !videoEnabled });
          }
          return;
        }

        if (sig.kind === "offer" && sig.sdp) {
          await pc.setRemoteDescription(sig.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
            callId,
            to: state.activeCall.from,
            payload: { kind: "answer", sdp: pc.localDescription },
          });
        } else if (sig.kind === "answer" && sig.sdp) {
          await pc.setRemoteDescription(sig.sdp);
        } else if (sig.kind === "ice" && sig.candidate) {
          await pc.addIceCandidate(sig.candidate);
        }
      } catch (err) {
        set({ callError: extractMessage(err) });
      }
    });

    set({ socket, realtimeConnected: false, realtimeError: null });
    socket.connect();
  },

  stopRealtime: () => {
    const socket = get().socket;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    get()._cleanupCallResources();
    set({
      socket: null,
      realtimeConnected: false,
      realtimeError: null,
      presenceByUser: {},
      typingByChat: {},
      _typingTimeouts: {},
      activeCall: null,
      callError: null,
      localStream: null,
      remoteStream: null,
      micMuted: false,
      camOff: false,
    });
  },

  // Internal (not for UI)
  _pc: null,
  _cleanupCallResources: () => {
    const pc = get()._pc;
    const local = get().localStream;
    const remote = get().remoteStream;

    try {
      if (pc) {
        try {
          pc.ontrack = null;
          pc.onicecandidate = null;
          pc.onconnectionstatechange = null;
          pc.close();
        } catch {
          // ignore
        }
      }
    } finally {
      stopStream(local);
      stopStream(remote);
      set({
        _pc: null,
        localStream: null,
        remoteStream: null,
        micMuted: false,
        camOff: false,
        remoteCamOff: false,
      });
    }
  },

  initiateCall: async (chatId, type = "audio") => {
    const callType = type === "video" ? "video" : "audio";
    const state = get();
    const socket = state.socket;
    const myId = useAuthStore.getState()?.user?._id;
    const chat = (state.chats || []).find((c) => c?._id === chatId);
    if (!socket || !socket.connected) {
      set({ callError: "Realtime not connected" });
      return null;
    }
    if (!myId || !chatId || !chat || chat.isGroup) {
      set({ callError: "Only 1-to-1 calls supported" });
      return null;
    }
    if (state.activeCall && state.activeCall.state !== "ended") {
      set({ callError: "Already in a call" });
      return null;
    }

    const otherId = getOtherParticipantId(chat, myId);
    if (!otherId) {
      set({ callError: "User not found" });
      return null;
    }
    if (String(otherId) === String(myId)) {
      set({ callError: "Cannot call yourself" });
      return null;
    }

    const callId = makeCallId();
    set({
      activeCall: {
        callId,
        chatId,
        from: myId,
        to: otherId,
        type: callType,
        state: "outgoing",
        startedAt: Date.now(),
        connectedAt: null,
      },
      callError: null,
    });

    try {
      const constraints = { audio: true, video: callType === "video" };
      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      const pc = createPeerConnection();
      const remoteStream = new MediaStream();

      pc.ontrack = (ev) => {
        const track = ev?.track;
        if (track) {
          const existing = remoteStream.getTracks?.() || [];
          const alreadyAdded = existing.some((t) => t?.id === track.id);
          if (!alreadyAdded) remoteStream.addTrack(track);
        }
        set((s) => {
          const ac = s.activeCall;
          if (!ac || ac.callId !== callId) return {};
          return {
            remoteStream,
            activeCall: {
              ...ac,
              state: ac.state === "connecting" ? "active" : ac.state,
              connectedAt: ac.connectedAt || Date.now(),
            },
          };
        });
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
          callId,
          to: otherId,
          payload: { kind: "ice", candidate: ev.candidate },
        });
      };

      pc.onconnectionstatechange = () => {
        const cs = pc.connectionState;
        if (cs === "connected") {
          set((s) => {
            const ac = s.activeCall;
            if (!ac || ac.callId !== callId) return {};
            return {
              activeCall: {
                ...ac,
                state: "active",
                connectedAt: ac.connectedAt || Date.now(),
              },
            };
          });
        }
      };

      localStream
        .getTracks()
        .forEach((track) => pc.addTrack(track, localStream));

      set({
        _pc: pc,
        localStream,
        remoteStream,
        micMuted: false,
        camOff: callType !== "video" ? true : false,
        remoteCamOff: false,
      });

      socket.emit(SOCKET_EVENTS.CALL_INITIATE, {
        callId,
        chatId,
        to: otherId,
        type: callType,
      });

      return callId;
    } catch (err) {
      set({ callError: extractMessage(err), activeCall: null });
      get()._cleanupCallResources();
      return null;
    }
  },

  acceptCall: async () => {
    const state = get();
    const socket = state.socket;
    const call = state.activeCall;
    if (!socket || !socket.connected || !call || call.state !== "incoming")
      return;

    set({ callError: null, activeCall: { ...call, state: "connecting" } });

    try {
      const constraints = { audio: true, video: call.type === "video" };
      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      const pc = createPeerConnection();
      const remoteStream = new MediaStream();

      pc.ontrack = (ev) => {
        const track = ev?.track;
        if (track) {
          const existing = remoteStream.getTracks?.() || [];
          const alreadyAdded = existing.some((t) => t?.id === track.id);
          if (!alreadyAdded) remoteStream.addTrack(track);
        }
        set((s) => {
          const ac = s.activeCall;
          if (!ac || ac.callId !== call.callId) return {};
          return {
            remoteStream,
            activeCall: {
              ...ac,
              state: "active",
              connectedAt: ac.connectedAt || Date.now(),
            },
          };
        });
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
          callId: call.callId,
          to: call.from,
          payload: { kind: "ice", candidate: ev.candidate },
        });
      };

      pc.onconnectionstatechange = () => {
        const cs = pc.connectionState;
        if (cs === "connected") {
          set((s) => {
            const ac = s.activeCall;
            if (!ac || ac.callId !== call.callId) return {};
            return {
              activeCall: {
                ...ac,
                state: "active",
                connectedAt: ac.connectedAt || Date.now(),
              },
            };
          });
        }
      };

      localStream
        .getTracks()
        .forEach((track) => pc.addTrack(track, localStream));
      set({
        _pc: pc,
        localStream,
        remoteStream,
        micMuted: false,
        camOff: call.type !== "video" ? true : false,
        remoteCamOff: false,
      });

      socket.emit(SOCKET_EVENTS.CALL_ACCEPT, {
        callId: call.callId,
        chatId: call.chatId,
      });
    } catch (err) {
      set({ callError: extractMessage(err) });
      socket.emit(SOCKET_EVENTS.CALL_DECLINE, {
        callId: call.callId,
        chatId: call.chatId,
      });
      set({ activeCall: null });
      get()._cleanupCallResources();
    }
  },

  declineCall: () => {
    const state = get();
    const socket = state.socket;
    const call = state.activeCall;
    if (!call) return;
    try {
      if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.CALL_DECLINE, {
          callId: call.callId,
          chatId: call.chatId,
        });
      }
    } finally {
      set({ activeCall: null });
      get()._cleanupCallResources();
    }
  },

  endCall: () => {
    const state = get();
    const socket = state.socket;
    const call = state.activeCall;
    if (!call) return;
    const connectedAt = call.connectedAt;
    const durationSec = connectedAt
      ? Math.max(0, Math.round((Date.now() - connectedAt) / 1000))
      : undefined;
    try {
      if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.CALL_END, {
          callId: call.callId,
          chatId: call.chatId,
          durationSec,
        });
      }
    } finally {
      set({ activeCall: { ...call, state: "ended" } });
      get()._cleanupCallResources();
      // Clear after short delay so UI can show ended state briefly
      window.setTimeout(() => {
        const ac = get().activeCall;
        if (ac && ac.callId === call.callId && ac.state === "ended") {
          set({ activeCall: null, callError: null });
        }
      }, 600);
    }
  },

  toggleMute: () => {
    const local = get().localStream;
    if (!local) return;
    const tracks = local.getAudioTracks?.() || [];
    if (!tracks.length) return;
    const next = !get().micMuted;
    tracks.forEach((t) => {
      t.enabled = next ? false : true;
    });
    set({ micMuted: next });
  },

  toggleCamera: () => {
    const state = get();
    const call = state.activeCall;
    if (!call || call.type !== "video") return;

    const socket = state.socket;
    const pc = state._pc;
    const local = state.localStream;
    if (!pc || !local) return;

    const nextCamOff = !state.camOff;
    const peerId =
      String(call.from) === String(useAuthStore.getState()?.user?._id)
        ? call.to
        : call.from;

    const emitMedia = (videoEnabled) => {
      try {
        if (socket && socket.connected && call?.callId && peerId) {
          socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
            callId: call.callId,
            to: peerId,
            payload: { kind: "media", videoEnabled },
          });
        }
      } catch {
        // ignore
      }
    };

    // Find the existing RTCRtpSender for video if present.
    const senders = pc.getSenders?.() || [];
    const videoSender =
      senders.find((s) => s?.track && s.track.kind === "video") || null;

    if (nextCamOff) {
      // Turn camera OFF: stop track, remove from stream, and replaceTrack(null)
      const tracks = local.getVideoTracks?.() || [];
      tracks.forEach((t) => {
        try {
          local.removeTrack(t);
        } catch {
          // ignore
        }
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      try {
        if (videoSender?.replaceTrack) videoSender.replaceTrack(null);
      } catch {
        // ignore
      }
      set({ camOff: true });
      emitMedia(false);
      return;
    }

    // Turn camera ON: get a fresh video track and replaceTrack(track)
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const track = (stream.getVideoTracks?.() || [])[0] || null;
        if (!track) return;
        try {
          local.addTrack(track);
        } catch {
          // ignore
        }
        if (videoSender?.replaceTrack) {
          await videoSender.replaceTrack(track);
        } else {
          // Fallback: addTrack creates a sender (may require renegotiation in some browsers)
          pc.addTrack(track, local);
        }
        set({ localStream: local, camOff: false });
        emitMedia(true);
      } catch {
        // ignore
      }
    })();
  },

  joinAllChats: () => {
    const socket = get().socket;
    if (!socket || !socket.connected) return;
    const ids = (get().chats || []).map((c) => c?._id).filter(Boolean);
    if (ids.length) socket.emit(SOCKET_EVENTS.JOIN_CHATS, { chatIds: ids });
  },

  emitDelivered: async (chatId, messageId) => {
    if (!chatId || !messageId) return;
    const socket = get().socket;
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { chatId, messageId });
      return;
    }
    try {
      await updateMessageStatusApi(messageId, "delivered");
    } catch {
      // ignore
    }
  },

  emitSeen: async (chatId, messageId) => {
    if (!chatId || !messageId) return;
    const socket = get().socket;
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.MESSAGE_SEEN, { chatId, messageId });
      return;
    }
    try {
      await updateMessageStatusApi(messageId, "seen");
    } catch {
      // ignore
    }
  },

  markChatRead: async (chatId) => {
    if (!chatId) return;
    const myId = useAuthStore.getState()?.user?._id;
    if (!myId) return;
    const items = get().messagesByChat?.[chatId]?.items || [];
    for (const m of items) {
      const senderId = getSenderId(m);
      if (!senderId || senderId === myId) continue;
      const status = m?.status;
      if (m?._id && status === "sent") {
        // Delivered but not yet seen
        // eslint-disable-next-line no-await-in-loop
        await get().emitDelivered(chatId, m._id);
      }
      if (m?._id && status !== "seen") {
        // eslint-disable-next-line no-await-in-loop
        await get().emitSeen(chatId, m._id);
      }
    }
  },

  emitTyping: (chatId) => {
    const socket = get().socket;
    if (!socket || !socket.connected || !chatId) return;
    socket.emit(SOCKET_EVENTS.TYPING, { chatId, isTyping: true });

    // Debounce stop-typing.
    const timeouts = get()._typingTimeouts || {};
    const existing = timeouts[chatId];
    if (existing) window.clearTimeout(existing);
    const id = window.setTimeout(() => {
      get().emitStopTyping(chatId);
    }, 1200);

    set((s) => ({
      _typingTimeouts: { ...(s._typingTimeouts || {}), [chatId]: id },
    }));
  },

  emitStopTyping: (chatId) => {
    const socket = get().socket;
    if (socket && socket.connected && chatId) {
      socket.emit(SOCKET_EVENTS.STOP_TYPING, { chatId });
    }
    set((s) => {
      const next = { ...(s._typingTimeouts || {}) };
      if (next[chatId]) {
        window.clearTimeout(next[chatId]);
        delete next[chatId];
      }
      return { _typingTimeouts: next };
    });
  },

  loadChats: async () => {
    set({ chatsLoading: true, chatsError: null });
    try {
      const res = await getUserChats({ page: 1, limit: 50 });
      const chats = res?.data || [];
      set({ chats, chatsLoading: false });

      // If realtime is connected, join chat rooms.
      get().joinAllChats();

      // Auto-select first chat if none selected
      const current = get().selectedChatId;
      if (!current && chats.length > 0) {
        get().selectChat(chats[0]._id);
      }
    } catch (err) {
      set({ chatsLoading: false, chatsError: extractMessage(err) });
    }
  },

  refreshChatDetails: async (chatId) => {
    if (!chatId) return null;
    try {
      const res = await getChatById(chatId);
      const chat = res?.data;
      if (!chat?._id) throw new Error("Invalid chat response");
      set((s) => ({ chats: upsertChat(s.chats, chat) }));
      return chat;
    } catch (err) {
      set({ chatsError: extractMessage(err) });
      return null;
    }
  },

  createChatWithUser: async (userId) => {
    if (!userId) return null;
    try {
      const res = await createOrGetChat(userId);
      const chat = res?.data;
      if (!chat?._id) throw new Error("Invalid chat response");

      set((s) => ({ chats: upsertChat(s.chats, chat) }));

      // If realtime is connected, join this new chat room.
      const socket = get().socket;
      if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.JOIN_CHATS, { chatIds: [chat._id] });
      }

      await get().selectChat(chat._id);
      return chat;
    } catch (err) {
      set({ chatsError: extractMessage(err) });
      return null;
    }
  },

  createGroupChat: async ({ name, memberIds = [] } = {}) => {
    const groupName = String(name || "").trim();
    const members = Array.isArray(memberIds) ? memberIds.filter(Boolean) : [];

    if (!groupName) {
      set({ chatsError: "Group name is required" });
      return null;
    }
    if (members.length < 1) {
      set({ chatsError: "Select at least 1 member" });
      return null;
    }

    try {
      const res = await createGroupApi({ name: groupName, memberIds: members });
      const payload = res?.data;
      const chat = payload?.chat;
      if (!chat?._id) throw new Error("Invalid group response");

      set((s) => ({ chats: upsertChat(s.chats, chat), chatsError: null }));

      const socket = get().socket;
      if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.JOIN_CHATS, { chatIds: [chat._id] });
      }

      await get().selectChat(chat._id);
      return payload;
    } catch (err) {
      set({ chatsError: extractMessage(err) });
      return null;
    }
  },

  selectChat: async (chatId) => {
    if (!chatId) {
      set({ selectedChatId: null });
      return;
    }
    set({ selectedChatId: chatId });

    const state = get();
    const existing = state.messagesByChat[chatId];
    if (existing?.items?.length) {
      await get().markChatRead(chatId);
      return;
    }

    await get().loadMessages(chatId);
  },

  loadMessages: async (chatId) => {
    set((s) => ({
      messagesByChat: {
        ...s.messagesByChat,
        [chatId]: {
          items: s.messagesByChat[chatId]?.items || [],
          loading: true,
          error: null,
        },
      },
    }));

    try {
      const res = await getChatMessages(chatId, { page: 1, limit: 50 });
      const items = res?.data || [];
      set((s) => ({
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: {
            items: uniqById([
              ...(s.messagesByChat[chatId]?.items || []),
              ...items,
            ]),
            loading: false,
            error: null,
          },
        },
      }));

      await get().markChatRead(chatId);
    } catch (err) {
      set((s) => ({
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: {
            items: s.messagesByChat[chatId]?.items || [],
            loading: false,
            error: extractMessage(err),
          },
        },
      }));
    }
  },

  sendTextMessage: async (chatId, text) => {
    const trimmed = String(text || "").trim();
    if (!trimmed) return false;

    const auth = useAuthStore.getState();
    const myId = auth?.user?._id;

    // Optimistic append
    const tempId = `temp:${Date.now()}`;
    const optimistic = {
      _id: tempId,
      chat: chatId,
      type: "text",
      content: trimmed,
      meta: { clientId: tempId },
      replyTo: get()._replyToByChat?.[chatId] || null,
      sender: myId ? { _id: myId, username: auth.user?.username } : undefined,
      createdAt: new Date().toISOString(),
      status: "sent",
      _optimistic: true,
    };

    set((s) => ({
      messagesByChat: {
        ...s.messagesByChat,
        [chatId]: {
          items: [...(s.messagesByChat[chatId]?.items || []), optimistic],
          loading: false,
          error: null,
        },
      },
    }));

    try {
      const socket = get().socket;
      const replyToId = get()._replyToByChat?.[chatId] || null;

      if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
          chatId,
          type: "text",
          content: trimmed,
          meta: { clientId: tempId, replyToId },
        });

        // clear reply state after sending
        get().setReplyTo(chatId, null);
        return true;
      }

      const res = await sendMessageApi(chatId, {
        type: "text",
        content: trimmed,
        meta: { clientId: tempId, replyToId },
      });
      const saved = res?.data;
      if (!saved?._id) throw new Error("Invalid send response");

      set((s) => ({
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: {
            items: (s.messagesByChat[chatId]?.items || []).map((m) =>
              m._id === tempId || m?.meta?.clientId === tempId ? saved : m
            ),
            loading: false,
            error: null,
          },
        },
      }));

      // Update chat list lastMessage/updatedAt locally
      set((s) => ({
        chats: (s.chats || []).map((c) =>
          c._id === chatId
            ? {
                ...c,
                lastMessage: saved,
                updatedAt: saved.createdAt || c.updatedAt,
              }
            : c
        ),
      }));

      get().setReplyTo(chatId, null);
      return true;
    } catch (err) {
      // Remove optimistic message and set error
      set((s) => ({
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: {
            items: (s.messagesByChat[chatId]?.items || []).filter(
              (m) => m._id !== tempId && m?.meta?.clientId !== tempId
            ),
            loading: false,
            error: extractMessage(err),
          },
        },
      }));
      return false;
    }
  },

  sendMediaMessage: async (chatId, file) => {
    if (!chatId || !file) return false;

    const auth = useAuthStore.getState();
    const myId = auth?.user?._id;
    const type = getMessageTypeFromMime(file.type);
    const tempId = `temp:${Date.now()}`;

    const localPreviewUrl = (() => {
      try {
        return URL.createObjectURL(file);
      } catch {
        return null;
      }
    })();

    const optimistic = {
      _id: tempId,
      chat: chatId,
      type,
      content: file.name || "Attachment",
      meta: {
        fileName: file.name,
        fileUrl: localPreviewUrl || undefined,
        fileSize: file.size,
        mimeType: file.type,
      },
      sender: myId ? { _id: myId, username: auth.user?.username } : undefined,
      createdAt: new Date().toISOString(),
      status: "sent",
      _optimistic: true,
    };

    set((s) => ({
      messagesByChat: {
        ...s.messagesByChat,
        [chatId]: {
          items: [...(s.messagesByChat[chatId]?.items || []), optimistic],
          loading: false,
          error: null,
        },
      },
    }));

    try {
      const uploadRes = await uploadMediaApi(file);
      const fileData = uploadRes?.data;
      if (!fileData?.fileUrl) throw new Error("Upload failed");

      const socket = get().socket;
      const payload = {
        chatId,
        type: fileData.type || type,
        content: fileData.fileName || file.name || "Attachment",
        meta: {
          fileName: fileData.fileName,
          fileUrl: fileData.fileUrl,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          replyToId: get()._replyToByChat?.[chatId] || null,
        },
      };

      if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, payload);
        get().setReplyTo(chatId, null);
        return true;
      }

      const res = await sendMessageApi(chatId, payload);
      const saved = res?.data;
      if (!saved?._id) throw new Error("Invalid send response");

      set((s) => ({
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: {
            items: (s.messagesByChat[chatId]?.items || []).map((m) =>
              m._id === tempId ? saved : m
            ),
            loading: false,
            error: null,
          },
        },
      }));

      set((s) => ({
        chats: (s.chats || []).map((c) =>
          c._id === chatId
            ? {
                ...c,
                lastMessage: saved,
                updatedAt: saved.createdAt || c.updatedAt,
              }
            : c
        ),
      }));

      get().setReplyTo(chatId, null);
      return true;
    } catch (err) {
      set((s) => ({
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: {
            items: (s.messagesByChat[chatId]?.items || []).filter(
              (m) => m._id !== tempId
            ),
            loading: false,
            error: extractMessage(err),
          },
        },
      }));
      return false;
    }
  },

  // Reply state (per chat)
  _replyToByChat: {},
  setReplyTo: (chatId, messageId) => {
    if (!chatId) return;
    set((s) => ({
      _replyToByChat: {
        ...(s._replyToByChat || {}),
        [chatId]: messageId || null,
      },
    }));
  },

  // Reactions
  toggleReaction: async (chatId, messageId, emoji) => {
    if (!chatId || !messageId || !emoji) return false;
    const socket = get().socket;
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.MESSAGE_REACTION, { chatId, messageId, emoji });
      return true;
    }
    try {
      const res = await toggleReactionApi(messageId, emoji);
      const updated = res?.data;
      if (updated?._id) {
        set((s) => ({
          messagesByChat: patchMessageByPredicate(
            s.messagesByChat,
            chatId,
            (m) => m?._id === messageId,
            { reactions: updated.reactions || [] }
          ),
        }));
      }
      return true;
    } catch (err) {
      set((s) => ({ chatsError: extractMessage(err) }));
      return false;
    }
  },

  deleteMessageFromChat: async (chatId, messageId) => {
    if (!chatId || !messageId) return false;

    // Optimistic remove
    set((s) => {
      const entry = s.messagesByChat?.[chatId];
      const items = Array.isArray(entry?.items) ? entry.items : [];
      return {
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: {
            ...entry,
            items: items.filter((m) => m?._id !== messageId),
          },
        },
      };
    });

    // Temp messages don't exist on server
    if (String(messageId).startsWith("temp:")) return true;

    try {
      await deleteMessageApi(messageId);
      return true;
    } catch (err) {
      // Restore is complex (we'd need a snapshot). For now, surface error on chat.
      set((s) => ({ chatsError: extractMessage(err) }));
      return false;
    }
  },

  reset: () =>
    (() => {
      const socket = get().socket;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      set({
        chats: [],
        chatsLoading: false,
        chatsError: null,
        selectedChatId: null,
        messagesByChat: {},
        socket: null,
        realtimeConnected: false,
        realtimeError: null,
        presenceByUser: {},
        typingByChat: {},
        _typingTimeouts: {},
      });
    })(),
}));
