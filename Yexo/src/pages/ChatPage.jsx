import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile, searchUsers } from "../api/users";
import CallScreen from "../components/CallScreen";
import IncomingCallBanner from "../components/IncomingCallBanner";
import {
  addGroupMembers,
  deleteGroup,
  leaveGroup,
  removeGroupMember,
} from "../api/groups";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { getApiBaseUrl } from "../api/http";

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLastSeen(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getChatDisplayName(chat, myUserId) {
  if (!chat) return "Select a chat";
  if (chat.isGroup) return chat.group?.name || "Group";
  const other = (chat.participants || []).find(
    (p) => p?._id && p._id !== myUserId
  );
  return other?.username || "Chat";
}

function getChatSubtitle(chat, myUserId) {
  if (!chat) return "Online / typing indicators will appear here";
  if (chat.isGroup) return "Group chat";
  const other = (chat.participants || []).find(
    (p) => p?._id && p._id !== myUserId
  );
  if (!other) return "";
  return other.isOnline ? "Online" : "Offline";
}

function getLastMessagePreview(chat) {
  const last = chat?.lastMessage;
  if (!last) return "";
  // Note: backend currently returns encrypted lastMessage fields in chat list.
  if (typeof last.content === "string" && last.content.trim())
    return last.content;
  if (typeof last.type === "string" && last.type === "call") return "📞 Call";
  if (typeof last.type === "string" && last.type !== "text")
    return `[${last.type}]`;
  if (last.contentEncrypted) return "Encrypted message";
  return "";
}

function getSenderId(message) {
  return typeof message?.sender === "string"
    ? message.sender
    : message?.sender?._id;
}

function pickReplySnippet(message) {
  if (!message) return "";
  if (message.type === "text") return message.content || "";
  if (message.type === "image") return "Photo";
  if (message.type === "video") return "Video";
  if (message.type === "audio") return "Voice message";
  return "Attachment";
}

function groupReactions(reactions) {
  if (!Array.isArray(reactions) || reactions.length === 0) return [];
  const map = new Map();
  for (const r of reactions) {
    const emoji = r?.emoji;
    if (!emoji) continue;
    map.set(emoji, (map.get(emoji) || 0) + 1);
  }
  return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState(null);
  const [accountUserId, setAccountUserId] = useState(null);
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(null);

  const chats = useChatStore((s) => s.chats);
  const chatsLoading = useChatStore((s) => s.chatsLoading);
  const chatsError = useChatStore((s) => s.chatsError);
  const selectedChatId = useChatStore((s) => s.selectedChatId);
  const messagesByChat = useChatStore((s) => s.messagesByChat);
  const loadChats = useChatStore((s) => s.loadChats);
  const selectChat = useChatStore((s) => s.selectChat);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const sendMediaMessage = useChatStore((s) => s.sendMediaMessage);
  const deleteMessageFromChat = useChatStore((s) => s.deleteMessageFromChat);
  const createGroupChat = useChatStore((s) => s.createGroupChat);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const replyToByChat = useChatStore((s) => s._replyToByChat);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const createChatWithUser = useChatStore((s) => s.createChatWithUser);
  const startRealtime = useChatStore((s) => s.startRealtime);
  const stopRealtime = useChatStore((s) => s.stopRealtime);
  const emitTyping = useChatStore((s) => s.emitTyping);
  const emitStopTyping = useChatStore((s) => s.emitStopTyping);
  const presenceByUser = useChatStore((s) => s.presenceByUser);
  const typingByChat = useChatStore((s) => s.typingByChat);
  const refreshChatDetails = useChatStore((s) => s.refreshChatDetails);

  // Calls
  const activeCall = useChatStore((s) => s.activeCall);
  const callError = useChatStore((s) => s.callError);
  const localStream = useChatStore((s) => s.localStream);
  const remoteStream = useChatStore((s) => s.remoteStream);
  const micMuted = useChatStore((s) => s.micMuted);
  const camOff = useChatStore((s) => s.camOff);
  const remoteCamOff = useChatStore((s) => s.remoteCamOff);
  const initiateCall = useChatStore((s) => s.initiateCall);
  const acceptCall = useChatStore((s) => s.acceptCall);
  const declineCall = useChatStore((s) => s.declineCall);
  const endCall = useChatStore((s) => s.endCall);
  const toggleMute = useChatStore((s) => s.toggleMute);
  const toggleCamera = useChatStore((s) => s.toggleCamera);

  // User info drawer (WhatsApp-like for 1:1)
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  const [userInfoError, setUserInfoError] = useState(null);

  // Group settings drawer (WhatsApp-like)
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [groupSettingsLoading, setGroupSettingsLoading] = useState(false);
  const [groupSettingsError, setGroupSettingsError] = useState(null);
  const [groupAddQuery, setGroupAddQuery] = useState("");
  const [groupAddResults, setGroupAddResults] = useState([]);
  const [groupAddSelected, setGroupAddSelected] = useState([]); // User[]
  const [groupAddLoading, setGroupAddLoading] = useState(false);
  const [groupAddError, setGroupAddError] = useState(null);
  const [groupActionError, setGroupActionError] = useState(null);
  const [groupActionWorking, setGroupActionWorking] = useState(false);

  // Sidebar menu + group creation
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberQuery, setGroupMemberQuery] = useState("");
  const [groupMemberResults, setGroupMemberResults] = useState([]);
  const [groupMemberLoading, setGroupMemberLoading] = useState(false);
  const [groupMemberError, setGroupMemberError] = useState(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]); // User[]
  const [createGroupError, setCreateGroupError] = useState(null);

  const [draft, setDraft] = useState("");
  const [attachError, setAttachError] = useState(null);

  const [pendingAttachment, setPendingAttachment] = useState(null); // { file, previewUrl, kind }
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, message, mine, fileUrl }
  const [reactionMenu, setReactionMenu] = useState(null); // { x, y, messageId }
  const recorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordStreamRef = useRef(null);

  const clearPendingAttachment = () => {
    setAttachError(null);
    setRecordError(null);
    setPendingAttachment((prev) => {
      if (prev?.previewUrl && String(prev.previewUrl).startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prev.previewUrl);
        } catch {
          // ignore
        }
      }
      return null;
    });
  };

  const setPendingFromFile = (file) => {
    if (!file) return;
    clearPendingAttachment();
    const kind = (() => {
      const mt = String(file.type || "").toLowerCase();
      if (mt.startsWith("image/")) return "image";
      if (mt.startsWith("video/")) return "video";
      if (mt.startsWith("audio/")) return "audio";
      return "file";
    })();
    const previewUrl = (() => {
      try {
        return URL.createObjectURL(file);
      } catch {
        return "";
      }
    })();
    setPendingAttachment({ file, previewUrl, kind });
  };

  const selectedChat = useMemo(
    () => (chats || []).find((c) => c?._id === selectedChatId) || null,
    [chats, selectedChatId]
  );

  const incomingCallerName = useMemo(() => {
    if (!activeCall || activeCall?.state !== "incoming") return "";
    const chatId = activeCall?.chatId;
    const fromId = activeCall?.from;
    const chat = (chats || []).find((c) => c?._id === chatId) || null;
    const p = (chat?.participants || []).find((x) => x?._id === fromId);
    return p?.username || "";
  }, [activeCall?.chatId, activeCall?.from, activeCall?.state, chats]);

  const otherUser = useMemo(() => {
    if (!selectedChatId || !selectedChat || selectedChat.isGroup) return null;
    const myId = user?._id;
    return (selectedChat.participants || []).find(
      (p) => p?._id && (!myId || p._id !== myId)
    );
  }, [selectedChatId, selectedChat, user?._id]);
  const messageState = selectedChatId ? messagesByChat[selectedChatId] : null;
  const messages = messageState?.items || [];
  const messagesLoading = !!messageState?.loading;
  const messagesError = messageState?.error || null;

  const messagesById = useMemo(() => {
    const map = new Map();
    for (const m of messages || []) {
      if (m?._id) map.set(String(m._id), m);
    }
    return map;
  }, [messages]);

  const replyToId = selectedChatId ? replyToByChat?.[selectedChatId] : null;
  const replyToMessage = useMemo(() => {
    if (!replyToId) return null;
    return messagesById.get(String(replyToId)) || null;
  }, [messagesById, replyToId]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    const onDown = () => setSidebarMenuOpen(false);
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarMenuOpen(false);
    };
    if (!sidebarMenuOpen) return;
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [sidebarMenuOpen]);

  useEffect(() => {
    if (!creatingGroup) return;
    const q = String(groupMemberQuery || "").trim();
    if (!q) {
      setGroupMemberResults([]);
      setGroupMemberError(null);
      setGroupMemberLoading(false);
      return;
    }

    let alive = true;
    setGroupMemberLoading(true);
    setGroupMemberError(null);

    const t = window.setTimeout(() => {
      searchUsers(q, { limit: 10 })
        .then((res) => {
          if (!alive) return;
          const list = Array.isArray(res?.data) ? res.data : [];
          const selectedIds = new Set(
            (selectedGroupMembers || []).map((u) => String(u?._id))
          );
          setGroupMemberResults(
            list.filter((u) => {
              if (!u?._id) return false;
              if (user?._id && u._id === user._id) return false;
              if (selectedIds.has(String(u._id))) return false;
              return true;
            })
          );
          setGroupMemberLoading(false);
        })
        .catch((err) => {
          if (!alive) return;
          setGroupMemberError(err?.message || "Search failed");
          setGroupMemberLoading(false);
        });
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [creatingGroup, groupMemberQuery, selectedGroupMembers, user?._id]);

  const resetCreateGroup = () => {
    setCreatingGroup(false);
    setSidebarMenuOpen(false);
    setGroupName("");
    setGroupMemberQuery("");
    setGroupMemberResults([]);
    setGroupMemberLoading(false);
    setGroupMemberError(null);
    setSelectedGroupMembers([]);
    setCreateGroupError(null);
  };

  const selectedGroupId = useMemo(() => {
    if (!selectedChat?.isGroup) return "";
    const g = selectedChat?.group;
    if (!g) return "";
    if (typeof g === "string") return g;
    return g?._id || "";
  }, [selectedChat]);

  const selectedGroupAdminIds = useMemo(() => {
    const g = selectedChat?.group;
    const admins = typeof g === "object" && g ? g.admins : [];
    if (!Array.isArray(admins)) return new Set();
    return new Set(
      admins
        .map((a) => (typeof a === "string" ? a : a?._id))
        .filter(Boolean)
        .map(String)
    );
  }, [selectedChat?.group]);

  const selectedGroupCreatorId = useMemo(() => {
    const g = selectedChat?.group;
    const createdBy = typeof g === "object" && g ? g.createdBy : null;
    if (!createdBy) return "";
    return String(
      typeof createdBy === "string" ? createdBy : createdBy?._id || ""
    );
  }, [selectedChat?.group]);

  const isGroupAdmin = useMemo(() => {
    if (!user?._id) return false;
    return selectedGroupAdminIds.has(String(user._id));
  }, [selectedGroupAdminIds, user?._id]);

  const closeGroupSettings = () => {
    setGroupSettingsOpen(false);
    setGroupSettingsLoading(false);
    setGroupSettingsError(null);
    setGroupAddQuery("");
    setGroupAddResults([]);
    setGroupAddSelected([]);
    setGroupAddLoading(false);
    setGroupAddError(null);
    setGroupActionError(null);
    setGroupActionWorking(false);
  };

  const closeUserInfo = () => {
    setUserInfoOpen(false);
    setUserInfoLoading(false);
    setUserInfoError(null);
  };

  const openUserInfo = async () => {
    if (!selectedChatId || !selectedChat || selectedChat.isGroup) return;
    setUserInfoOpen(true);
    setUserInfoError(null);
    setUserInfoLoading(true);
    const chat = await refreshChatDetails(selectedChatId);
    if (!chat?._id) setUserInfoError("Failed to load user info");
    setUserInfoLoading(false);
  };

  const openGroupSettings = async () => {
    if (!selectedChatId || !selectedChat?.isGroup) return;
    setGroupSettingsOpen(true);
    setGroupSettingsError(null);
    setGroupActionError(null);
    setGroupSettingsLoading(true);
    const chat = await refreshChatDetails(selectedChatId);
    if (!chat?._id) setGroupSettingsError("Failed to load group info");
    setGroupSettingsLoading(false);
  };

  useEffect(() => {
    if (!groupSettingsOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeGroupSettings();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupSettingsOpen]);

  useEffect(() => {
    if (!userInfoOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeUserInfo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userInfoOpen]);

  useEffect(() => {
    if (!groupSettingsOpen) return;
    if (!selectedChat?.isGroup) return;
    if (!isGroupAdmin) return;

    const q = String(groupAddQuery || "").trim();
    if (!q) {
      setGroupAddResults([]);
      setGroupAddError(null);
      setGroupAddLoading(false);
      return;
    }

    let alive = true;
    setGroupAddLoading(true);
    setGroupAddError(null);

    const t = window.setTimeout(() => {
      searchUsers(q, { limit: 10 })
        .then((res) => {
          if (!alive) return;
          const list = Array.isArray(res?.data) ? res.data : [];
          const selectedIds = new Set(
            (groupAddSelected || []).map((u) => String(u?._id))
          );
          const existingParticipantIds = new Set(
            (selectedChat?.participants || [])
              .map((p) => String(p?._id))
              .filter(Boolean)
          );
          setGroupAddResults(
            list.filter((u) => {
              if (!u?._id) return false;
              if (user?._id && u._id === user._id) return false;
              if (existingParticipantIds.has(String(u._id))) return false;
              if (selectedIds.has(String(u._id))) return false;
              return true;
            })
          );
          setGroupAddLoading(false);
        })
        .catch((err) => {
          if (!alive) return;
          setGroupAddError(err?.message || "Search failed");
          setGroupAddLoading(false);
        });
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [
    groupSettingsOpen,
    selectedChat?.isGroup,
    isGroupAdmin,
    groupAddQuery,
    groupAddSelected,
    selectedChat?.participants,
    user?._id,
  ]);

  useEffect(() => {
    const q = String(userSearch || "").trim();
    if (!q) {
      setUserResults([]);
      setUserSearchError(null);
      setUserSearchLoading(false);
      setAccountUserId(null);
      setAccount(null);
      setAccountError(null);
      setAccountLoading(false);
      return;
    }

    let alive = true;
    setUserSearchLoading(true);
    setUserSearchError(null);

    const t = window.setTimeout(() => {
      searchUsers(q, { limit: 10 })
        .then((res) => {
          if (!alive) return;
          const list = Array.isArray(res?.data) ? res.data : [];
          setUserResults(
            list.filter((u) => {
              if (!u?._id) return false;
              if (user?._id && u._id === user._id) return false;
              if (user?.username && u.username === user.username) return false;
              return true;
            })
          );
          setUserSearchLoading(false);
        })
        .catch((err) => {
          if (!alive) return;
          setUserSearchError(err?.message || "Search failed");
          setUserSearchLoading(false);
        });
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [userSearch, user?._id]);

  useEffect(() => {
    const id = accountUserId;
    if (!id) {
      setAccount(null);
      setAccountError(null);
      setAccountLoading(false);
      return;
    }

    let alive = true;
    setAccountLoading(true);
    setAccountError(null);

    getUserProfile(id)
      .then((res) => {
        if (!alive) return;
        setAccount(res?.data || null);
        setAccountLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setAccountError(err?.message || "Failed to load account");
        setAccountLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [accountUserId]);

  useEffect(() => {
    if (user?._id) startRealtime();
    return () => {
      stopRealtime();
    };
  }, [startRealtime, stopRealtime, user?._id]);

  const onSend = async (e) => {
    e.preventDefault();
    if (!selectedChatId) return;
    const text = draft;
    setDraft("");
    await sendTextMessage(selectedChatId, text);
    emitStopTyping(selectedChatId);
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.stop?.();
    } catch {
      // ignore
    }
  };

  const startRecording = async () => {
    setRecordError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setRecordError("Voice recording not supported in this browser");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      recordChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        setRecording(false);
        try {
          const chunks = recordChunksRef.current || [];
          const blob = new Blob(chunks, {
            type: recorder.mimeType || "audio/webm",
          });
          const file = new File([blob], `voice-${Date.now()}.webm`, {
            type: blob.type || "audio/webm",
          });
          setPendingFromFile(file);
        } catch {
          setRecordError("Failed to create voice note");
        }

        try {
          recordStreamRef.current?.getTracks?.().forEach((t) => t.stop());
        } catch {
          // ignore
        }
        recordStreamRef.current = null;
        recorderRef.current = null;
        recordChunksRef.current = [];
      };

      setRecording(true);
      recorder.start();
    } catch (err) {
      setRecording(false);
      setRecordError(err?.message || "Microphone permission denied");
      try {
        recordStreamRef.current?.getTracks?.().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      recordStreamRef.current = null;
      recorderRef.current = null;
      recordChunksRef.current = [];
    }
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      try {
        recordStreamRef.current?.getTracks?.().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      recordStreamRef.current = null;
      recorderRef.current = null;
      recordChunksRef.current = [];
    };
  }, []);

  const resolveFileUrl = (fileUrl) => {
    if (!fileUrl) return "";
    const s = String(fileUrl);
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("blob:")) return s;
    return `${getApiBaseUrl()}${s}`;
  };

  useEffect(() => {
    if (!contextMenu) return;

    const onDown = () => {
      setContextMenu(null);
      setReactionMenu(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setReactionMenu(null);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onDown, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onDown, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!reactionMenu) return;
    const onDown = () => setReactionMenu(null);
    const onKey = (e) => {
      if (e.key === "Escape") setReactionMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onDown, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onDown, true);
    };
  }, [reactionMenu]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      return true;
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = String(text || "");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.focus();
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const myInitial = (() => {
    const raw = (user?.username || "").trim();
    if (!raw) return "U";
    return raw[0].toUpperCase();
  })();

  const profileLogoButton = (
    <button
      type="button"
      onClick={() => navigate("/profile")}
      className="flex items-center gap-2"
      style={{ color: "var(--text-primary)" }}
      aria-label="Open profile"
      title="Profile"
    >
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold"
        style={{
          borderColor: "var(--border-color)",
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
        }}
      >
        {myInitial}
      </span>
      <span className="hidden text-sm md:inline">Profile</span>
    </button>
  );

  const searchPanel = (
    <div
      className="mb-2 rounded-xl border p-2"
      style={{
        borderColor: "var(--border-color)",
        background: "var(--bg-elevated)",
      }}
    >
      <input
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
        placeholder="Search users to start chat…"
        className="h-10 w-full rounded-lg border px-3 text-sm outline-none"
        style={{
          borderColor: "var(--border-color)",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        }}
      />

      {accountUserId ? (
        <div
          className="mt-2 rounded-xl border p-2"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--bg-secondary)",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div
                className="truncate text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {accountLoading
                  ? "Loading account…"
                  : account?.username || "Account"}
              </div>
              <div
                className="mt-0.5 text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {accountError
                  ? accountError
                  : account?.statusMessage ||
                    account?.email ||
                    account?.phoneNumber ||
                    " "}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAccountUserId(null);
                setAccount(null);
                setAccountError(null);
              }}
              className="shrink-0 rounded-lg border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--border-color)",
                background: "transparent",
                color: "var(--text-primary)",
              }}
            >
              Close
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={accountLoading || !account?._id}
              onClick={async () => {
                const id = account?._id || accountUserId;
                const chat = await createChatWithUser(id);
                if (chat?._id) {
                  setUserSearch("");
                  setUserResults([]);
                  setAccountUserId(null);
                  setAccount(null);
                }
              }}
              className="h-9 flex-1 rounded-lg border px-3 text-sm"
              style={{
                borderColor: "var(--border-color)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                opacity: accountLoading ? 0.7 : 1,
              }}
            >
              Start chat
            </button>
          </div>
        </div>
      ) : null}

      {userSearch.trim() ? (
        <div className="mt-2">
          {userSearchLoading ? (
            <div
              className="px-1 py-1 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              Searching…
            </div>
          ) : userSearchError ? (
            <div
              className="px-1 py-1 text-xs"
              style={{ color: "var(--text-primary)" }}
            >
              {userSearchError}
            </div>
          ) : userResults.length === 0 ? (
            <div
              className="px-1 py-1 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              No users found.
            </div>
          ) : (
            <div className="space-y-1">
              {userResults.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-2 py-2"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "transparent",
                    color: "var(--text-primary)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setAccountUserId(u._id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-sm font-semibold">
                      {u.username || "User"}
                    </div>
                    <div
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {u.statusMessage || u.email || u.phoneNumber || " "}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const chat = await createChatWithUser(u._id);
                      if (chat?._id) {
                        setUserSearch("");
                        setUserResults([]);
                        setAccountUserId(null);
                        setAccount(null);
                      }
                    }}
                    className="shrink-0 rounded-lg border px-2 py-1 text-xs"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Chat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  const chatsPanel = (
    <>
      {chatsLoading ? (
        <div
          className="px-2 py-2 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Loading chats…
        </div>
      ) : chatsError ? (
        <div
          className="px-2 py-2 text-sm"
          style={{ color: "var(--text-primary)" }}
        >
          {chatsError}
        </div>
      ) : (chats || []).length === 0 ? (
        <div
          className="px-2 py-2 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          No chats yet.
        </div>
      ) : (
        <div className="space-y-1">
          {(chats || []).map((chat) => {
            const active = chat._id === selectedChatId;
            const name = getChatDisplayName(chat, user?._id);
            const preview = getLastMessagePreview(chat);
            const initial = String(name || "").trim()
              ? String(name || "")
                  .trim()[0]
                  .toUpperCase()
              : "C";
            return (
              <button
                key={chat._id}
                type="button"
                onClick={() => selectChat(chat._id)}
                className="w-full rounded-xl border px-3 py-2 text-left"
                style={{
                  borderColor: "var(--border-color)",
                  background: active ? "var(--bg-elevated)" : "transparent",
                  color: "var(--text-primary)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                    }}
                    aria-hidden="true"
                  >
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold">
                        {name}
                      </div>
                      <div
                        className="shrink-0 text-[11px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatTime(chat.updatedAt)}
                      </div>
                    </div>
                    <div
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {preview || " "}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  const headerSubtitle = (() => {
    if (!selectedChat) return getChatSubtitle(selectedChat, user?._id);

    const typing = selectedChatId ? typingByChat?.[selectedChatId] : null;
    if (typing?.isTyping && typing?.userId && typing.userId !== user?._id) {
      return `${typing.username || "Someone"} typing…`;
    }

    if (selectedChat.isGroup) return "Group chat";

    const other = (selectedChat.participants || []).find(
      (p) => p?._id && p._id !== user?._id
    );
    if (!other) return "";
    const online = presenceByUser?.[other._id];
    if (typeof online === "boolean") return online ? "Online" : "Offline";
    return other.isOnline ? "Online" : "Offline";
  })();

  const headerName = selectedChatId
    ? getChatDisplayName(selectedChat, user?._id)
    : "Chats";

  const headerInitial = String(headerName || "").trim()
    ? String(headerName || "")
        .trim()[0]
        .toUpperCase()
    : "C";

  const callPeer = useMemo(() => {
    if (!activeCall || !activeCall.chatId) return null;
    const chat = (chats || []).find((c) => c?._id === activeCall.chatId);
    if (!chat) return null;
    const myId = user?._id;
    const peerId =
      myId && String(activeCall.from) === String(myId)
        ? activeCall.to
        : activeCall.from;
    if (!peerId) return null;
    return (
      (chat.participants || []).find(
        (p) => String(p?._id) === String(peerId)
      ) || null
    );
  }, [activeCall, chats, user?._id]);

  return (
    <div className="h-full" style={{ background: "var(--bg-primary)" }}>
      {!!activeCall &&
      activeCall?.state !== "incoming" &&
      activeCall?.state !== "ended" ? (
        <CallScreen
          call={activeCall}
          localStream={localStream}
          remoteStream={remoteStream}
          localName={user?.username || "You"}
          localAvatarUrl={user?.avatarUrl || null}
          peerName={callPeer?.username || ""}
          peerAvatarUrl={callPeer?.avatarUrl || null}
          micMuted={micMuted}
          camOff={camOff}
          remoteCamOff={remoteCamOff}
          error={callError}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      ) : null}
      {groupSettingsOpen && selectedChat?.isGroup ? (
        <div
          className="fixed inset-0 z-50"
          onMouseDown={() => closeGroupSettings()}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.35)" }}
          />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md border-l"
            style={{
              borderColor: "var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between gap-2 border-b px-4 py-3"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="text-sm font-semibold">Group info</div>
              <button
                type="button"
                className="h-9 w-9 rounded-full border text-sm font-semibold"
                style={{
                  borderColor: "var(--border-color)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                }}
                aria-label="Close"
                title="Close"
                onClick={closeGroupSettings}
              >
                ✕
              </button>
            </div>

            <div className="h-full overflow-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-lg font-semibold"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                  }}
                  aria-hidden="true"
                >
                  {headerInitial}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">
                    {selectedChat?.group?.name || headerName}
                  </div>
                  <div
                    className="truncate text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {(selectedChat?.participants || []).length} participants
                    {isGroupAdmin ? " • You’re an admin" : ""}
                  </div>
                </div>
              </div>

              {groupSettingsLoading ? (
                <div
                  className="mt-3 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Loading…
                </div>
              ) : groupSettingsError ? (
                <div className="mt-3 text-sm">{groupSettingsError}</div>
              ) : null}

              {selectedChat?.group?.description ? (
                <div
                  className="mt-3 rounded-xl border p-3 text-sm"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Description
                  </div>
                  <div
                    className="mt-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {selectedChat.group.description}
                  </div>
                </div>
              ) : null}

              {isGroupAdmin ? (
                <div
                  className="mt-3 rounded-xl border p-3"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div className="text-sm font-semibold">Add participants</div>
                  {groupAddSelected.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {groupAddSelected.map((m) => (
                        <button
                          key={m._id}
                          type="button"
                          className="rounded-full border px-2 py-1 text-xs"
                          style={{
                            borderColor: "var(--border-color)",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                          }}
                          onClick={() =>
                            setGroupAddSelected((prev) =>
                              (prev || []).filter((x) => x._id !== m._id)
                            )
                          }
                          title="Remove"
                        >
                          {m.username || "User"} ✕
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="mt-2 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Search and select users to add
                    </div>
                  )}

                  <input
                    value={groupAddQuery}
                    onChange={(e) => setGroupAddQuery(e.target.value)}
                    placeholder="Search users…"
                    className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                    }}
                  />

                  {groupAddLoading ? (
                    <div
                      className="mt-2 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Searching…
                    </div>
                  ) : groupAddError ? (
                    <div
                      className="mt-2 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {groupAddError}
                    </div>
                  ) : groupAddResults.length ? (
                    <div className="mt-2 space-y-1">
                      {groupAddResults.map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          className="w-full rounded-lg border px-2 py-2 text-left"
                          style={{
                            borderColor: "var(--border-color)",
                            background: "transparent",
                            color: "var(--text-primary)",
                          }}
                          onClick={() => {
                            setGroupAddSelected((prev) => [...(prev || []), u]);
                            setGroupAddQuery("");
                            setGroupAddResults([]);
                          }}
                        >
                          <div className="truncate text-sm font-semibold">
                            {u.username || "User"}
                          </div>
                          <div
                            className="mt-0.5 truncate text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {u.statusMessage || u.email || u.phoneNumber || " "}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      className="h-9 rounded-full px-3 text-sm font-semibold"
                      style={{
                        background: "var(--accent-green)",
                        color: "#fff",
                        opacity: groupActionWorking ? 0.7 : 1,
                      }}
                      disabled={groupActionWorking}
                      onClick={async () => {
                        if (!selectedGroupId) return;
                        const memberIds = (groupAddSelected || [])
                          .map((m) => m?._id)
                          .filter(Boolean);
                        if (memberIds.length < 1) {
                          setGroupActionError("Select at least 1 user to add");
                          return;
                        }
                        setGroupActionWorking(true);
                        setGroupActionError(null);
                        try {
                          await addGroupMembers(selectedGroupId, memberIds);
                          setGroupAddSelected([]);
                          setGroupAddQuery("");
                          setGroupAddResults([]);
                          await refreshChatDetails(selectedChatId);
                        } catch (err) {
                          setGroupActionError(
                            err?.message || "Failed to add members"
                          );
                        } finally {
                          setGroupActionWorking(false);
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}

              <div
                className="mt-3 rounded-xl border p-3"
                style={{
                  borderColor: "var(--border-color)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">Participants</div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {(selectedChat?.participants || []).length}
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  {(selectedChat?.participants || []).map((p) => {
                    const pid = String(p?._id || "");
                    if (!pid) return null;
                    const isMe = user?._id && pid === String(user._id);
                    const isAdmin = selectedGroupAdminIds.has(pid);
                    const isCreator =
                      selectedGroupCreatorId && pid === selectedGroupCreatorId;
                    const initial = String(p?.username || "U").trim()
                      ? String(p.username).trim()[0].toUpperCase()
                      : "U";

                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between gap-2 rounded-lg border px-2 py-2"
                        style={{
                          borderColor: "var(--border-color)",
                          background: "transparent",
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                            style={{
                              borderColor: "var(--border-color)",
                              background: "var(--bg-secondary)",
                              color: "var(--text-primary)",
                            }}
                            aria-hidden="true"
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {p?.username || "User"}
                              {isMe ? " (You)" : ""}
                            </div>
                            <div
                              className="truncate text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {isCreator
                                ? "Creator"
                                : isAdmin
                                ? "Admin"
                                : "Member"}
                            </div>
                          </div>
                        </div>

                        {isGroupAdmin && !isMe && !isCreator ? (
                          <button
                            type="button"
                            className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold"
                            style={{
                              borderColor: "var(--border-color)",
                              background: "var(--bg-secondary)",
                              color: "var(--text-primary)",
                              opacity: groupActionWorking ? 0.7 : 1,
                            }}
                            disabled={groupActionWorking}
                            onClick={async () => {
                              if (!selectedGroupId) return;
                              setGroupActionWorking(true);
                              setGroupActionError(null);
                              try {
                                await removeGroupMember(selectedGroupId, pid);
                                await refreshChatDetails(selectedChatId);
                              } catch (err) {
                                setGroupActionError(
                                  err?.message || "Failed to remove member"
                                );
                              } finally {
                                setGroupActionWorking(false);
                              }
                            }}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {groupActionError ? (
                <div
                  className="mt-3 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {groupActionError}
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-end gap-2">
                {selectedGroupCreatorId &&
                user?._id &&
                selectedGroupCreatorId === String(user._id) ? (
                  <button
                    type="button"
                    className="h-9 rounded-full border px-3 text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      opacity: groupActionWorking ? 0.7 : 1,
                    }}
                    disabled={groupActionWorking}
                    onClick={async () => {
                      if (!selectedGroupId) return;
                      setGroupActionWorking(true);
                      setGroupActionError(null);
                      try {
                        await deleteGroup(selectedGroupId);
                        closeGroupSettings();
                        await loadChats();
                        selectChat(null);
                      } catch (err) {
                        setGroupActionError(
                          err?.message || "Failed to delete group"
                        );
                      } finally {
                        setGroupActionWorking(false);
                      }
                    }}
                  >
                    Delete group
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-9 rounded-full border px-3 text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      opacity: groupActionWorking ? 0.7 : 1,
                    }}
                    disabled={groupActionWorking}
                    onClick={async () => {
                      if (!selectedGroupId) return;
                      setGroupActionWorking(true);
                      setGroupActionError(null);
                      try {
                        await leaveGroup(selectedGroupId);
                        closeGroupSettings();
                        await loadChats();
                        selectChat(null);
                      } catch (err) {
                        setGroupActionError(
                          err?.message || "Failed to leave group"
                        );
                      } finally {
                        setGroupActionWorking(false);
                      }
                    }}
                  >
                    Leave group
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {userInfoOpen &&
      selectedChatId &&
      selectedChat &&
      !selectedChat.isGroup ? (
        <div className="fixed inset-0 z-50" onMouseDown={() => closeUserInfo()}>
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.35)" }}
          />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md border-l"
            style={{
              borderColor: "var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between gap-2 border-b px-4 py-3"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="text-sm font-semibold">Contact info</div>
              <button
                type="button"
                className="h-9 w-9 rounded-full border text-sm font-semibold"
                style={{
                  borderColor: "var(--border-color)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                }}
                aria-label="Close"
                title="Close"
                onClick={closeUserInfo}
              >
                ✕
              </button>
            </div>

            <div className="h-full overflow-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-lg font-semibold"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                  }}
                  aria-hidden="true"
                >
                  {String(otherUser?.username || "U").trim()
                    ? String(otherUser?.username || "U")
                        .trim()[0]
                        .toUpperCase()
                    : "U"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">
                    {otherUser?.username || "User"}
                  </div>
                  <div
                    className="truncate text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {(() => {
                      const uid = otherUser?._id;
                      const live = uid ? presenceByUser?.[uid] : undefined;
                      const online =
                        typeof live === "boolean"
                          ? live
                          : !!otherUser?.isOnline;
                      if (online) return "Online";
                      const last = formatLastSeen(otherUser?.lastSeenAt);
                      return last ? `Last seen ${last}` : "Offline";
                    })()}
                  </div>
                </div>
              </div>

              {userInfoLoading ? (
                <div
                  className="mt-3 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Loading…
                </div>
              ) : userInfoError ? (
                <div className="mt-3 text-sm">{userInfoError}</div>
              ) : null}

              <div
                className="mt-3 rounded-xl border p-3"
                style={{
                  borderColor: "var(--border-color)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  About
                </div>
                <div
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {otherUser?.statusMessage || " "}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reactionMenu ? (
        <div
          className="fixed z-50 rounded-full border px-2 py-1"
          style={{
            left: Math.max(8, reactionMenu.x),
            top: Math.max(8, reactionMenu.y),
            borderColor: "var(--border-color)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="h-8 w-8 rounded-full"
                style={{
                  background: "transparent",
                  color: "var(--text-primary)",
                }}
                onClick={async () => {
                  if (!selectedChatId) return;
                  await toggleReaction(
                    selectedChatId,
                    reactionMenu.messageId,
                    emoji
                  );
                  setReactionMenu(null);
                  setContextMenu(null);
                }}
                aria-label={`React ${emoji}`}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-40 rounded-xl border p-1"
          style={{
            left: Math.max(8, contextMenu.x),
            top: Math.max(8, contextMenu.y),
            borderColor: "var(--border-color)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm"
            style={{ color: "var(--text-primary)" }}
            onClick={async () => {
              const m = contextMenu.message;
              const t =
                m?.type === "text"
                  ? m?.content
                  : contextMenu.fileUrl || m?.meta?.fileName || m?.content;
              await copyToClipboard(t || "");
              setContextMenu(null);
            }}
          >
            Copy
          </button>

          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm"
            style={{ color: "var(--text-primary)" }}
            onClick={() => {
              const y = Math.max(8, contextMenu.y - 48);
              setReactionMenu({
                x: contextMenu.x,
                y,
                messageId: contextMenu.message?._id,
              });
            }}
          >
            React
          </button>

          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm"
            style={{ color: "var(--text-primary)" }}
            onClick={() => {
              if (!selectedChatId) return;
              const m = contextMenu.message;
              if (!m?._id) return;
              setReplyTo(selectedChatId, m._id);
              setContextMenu(null);
              setReactionMenu(null);
            }}
          >
            Reply
          </button>

          {contextMenu.fileUrl ? (
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm"
              style={{ color: "var(--text-primary)" }}
              onClick={() => {
                try {
                  window.open(
                    contextMenu.fileUrl,
                    "_blank",
                    "noopener,noreferrer"
                  );
                } catch {
                  // ignore
                }
                setContextMenu(null);
              }}
            >
              Open
            </button>
          ) : null}

          {contextMenu.mine ? (
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm"
              style={{ color: "var(--text-primary)" }}
              onClick={async () => {
                const m = contextMenu.message;
                await deleteMessageFromChat(selectedChatId, m?._id);
                setContextMenu(null);
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mx-auto flex h-full max-w-360">
        {/* Left: Chat list */}
        <aside
          className="hidden h-full w-90 shrink-0 border-r md:flex md:flex-col"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--bg-secondary)",
          }}
        >
          <div
            className="flex items-center justify-between gap-3 border-b px-4 py-3"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="min-w-0">
              <div
                className="truncate text-base font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Yexo
              </div>
              <div
                className="truncate text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {user?.username
                  ? `Signed in as ${user.username}`
                  : "WhatsApp-like shell (backend wiring next)"}
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg"
                style={{
                  borderColor: "var(--border-color)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                }}
                aria-label="Menu"
                title="Menu"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSidebarMenuOpen((v) => !v)}
              >
                ⋮
              </button>

              {sidebarMenuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-xl border p-1"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm"
                    style={{ color: "var(--text-primary)" }}
                    onClick={() => {
                      setSidebarMenuOpen(false);
                      setCreatingGroup(true);
                      setCreateGroupError(null);
                    }}
                  >
                    Create group
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {creatingGroup ? (
              <div
                className="mb-2 rounded-xl border p-2"
                style={{
                  borderColor: "var(--border-color)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div
                  className="mb-2 flex items-center justify-between gap-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  <div className="text-sm font-semibold">New group</div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full border text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                    }}
                    aria-label="Cancel"
                    title="Cancel"
                    onClick={resetCreateGroup}
                  >
                    ✕
                  </button>
                </div>

                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="h-10 w-full rounded-lg border px-3 text-sm outline-none"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                  }}
                />

                {selectedGroupMembers.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedGroupMembers.map((m) => (
                      <button
                        key={m._id}
                        type="button"
                        className="rounded-full border px-2 py-1 text-xs"
                        style={{
                          borderColor: "var(--border-color)",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                        }}
                        onClick={() =>
                          setSelectedGroupMembers((prev) =>
                            (prev || []).filter((x) => x._id !== m._id)
                          )
                        }
                        title="Remove"
                      >
                        {m.username || "User"} ✕
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    className="mt-2 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Select 1 or more members
                  </div>
                )}

                <input
                  value={groupMemberQuery}
                  onChange={(e) => setGroupMemberQuery(e.target.value)}
                  placeholder="Search users to add…"
                  className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                  }}
                />

                {groupMemberLoading ? (
                  <div
                    className="mt-2 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Searching…
                  </div>
                ) : groupMemberError ? (
                  <div
                    className="mt-2 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {groupMemberError}
                  </div>
                ) : groupMemberResults.length ? (
                  <div className="mt-2 space-y-1">
                    {groupMemberResults.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        className="w-full rounded-lg border px-2 py-2 text-left"
                        style={{
                          borderColor: "var(--border-color)",
                          background: "transparent",
                          color: "var(--text-primary)",
                        }}
                        onClick={() => {
                          setSelectedGroupMembers((prev) => [
                            ...(prev || []),
                            u,
                          ]);
                          setGroupMemberQuery("");
                          setGroupMemberResults([]);
                        }}
                      >
                        <div className="truncate text-sm font-semibold">
                          {u.username || "User"}
                        </div>
                        <div
                          className="mt-0.5 truncate text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {u.statusMessage || u.email || u.phoneNumber || " "}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {createGroupError ? (
                  <div
                    className="mt-2 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {createGroupError}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    className="h-9 rounded-full px-3 text-sm font-semibold"
                    style={{
                      background: "var(--accent-green)",
                      color: "#fff",
                    }}
                    onClick={async () => {
                      const name = String(groupName || "").trim();
                      const memberIds = (selectedGroupMembers || [])
                        .map((m) => m?._id)
                        .filter(Boolean);

                      if (!name) {
                        setCreateGroupError("Group name is required");
                        return;
                      }
                      if (memberIds.length < 1) {
                        setCreateGroupError("Select at least 1 member");
                        return;
                      }

                      setCreateGroupError(null);
                      const res = await createGroupChat({ name, memberIds });
                      if (!res?.chat?._id) {
                        setCreateGroupError("Failed to create group");
                        return;
                      }
                      resetCreateGroup();
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : null}

            {searchPanel}
            {chatsPanel}
          </div>

          <div
            className="border-t p-3"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center justify-start">
              {profileLogoButton}
            </div>
          </div>
        </aside>

        {/* Center: Active chat */}
        <main className="flex h-full min-w-0 flex-1 flex-col">
          <header
            className="flex items-center justify-between gap-3 border-b px-4 py-3"
            style={{
              borderColor: "var(--border-color)",
              background: "var(--bg-secondary)",
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              {selectedChatId ? (
                <button
                  type="button"
                  className="md:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg font-semibold"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                  }}
                  aria-label="Back"
                  title="Back"
                  onClick={() => {
                    try {
                      setContextMenu(null);
                      setReactionMenu(null);
                      clearPendingAttachment();
                      setDraft("");
                      if (selectedChatId) setReplyTo(selectedChatId, null);
                    } finally {
                      selectChat(null);
                    }
                  }}
                >
                  ←
                </button>
              ) : null}

              {selectedChatId ? (
                selectedChat?.isGroup ? (
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                    }}
                    aria-label="Open group settings"
                    title="Group info"
                    onClick={openGroupSettings}
                  >
                    {headerInitial}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                    }}
                    aria-label="Open contact info"
                    title="Contact info"
                    onClick={openUserInfo}
                  >
                    {headerInitial}
                  </button>
                )
              ) : null}

              <div className="min-w-0">
                <div
                  className="truncate text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {headerName}
                </div>
                <div
                  className="truncate text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selectedChatId
                    ? headerSubtitle
                    : "Pick a chat or search to start one"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedChatId && selectedChat && !selectedChat.isGroup ? (
                <>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      opacity:
                        activeCall && activeCall.state !== "ended" ? 0.6 : 1,
                    }}
                    disabled={!!activeCall && activeCall.state !== "ended"}
                    aria-label="Voice call"
                    title="Voice call"
                    onClick={() => initiateCall(selectedChatId, "audio")}
                  >
                    📞
                  </button>

                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      opacity:
                        activeCall && activeCall.state !== "ended" ? 0.6 : 1,
                    }}
                    disabled={!!activeCall && activeCall.state !== "ended"}
                    aria-label="Video call"
                    title="Video call"
                    onClick={() => initiateCall(selectedChatId, "video")}
                  >
                    🎥
                  </button>
                </>
              ) : null}

              <div className="md:hidden">{profileLogoButton}</div>
            </div>
          </header>

          <section className="flex-1 overflow-auto px-4 py-6">
            <div className="mx-auto max-w-190 space-y-3">
              {activeCall?.state === "incoming" ? (
                <IncomingCallBanner
                  callerName={incomingCallerName}
                  type={activeCall?.type}
                  onAccept={() => {
                    if (activeCall?.chatId) selectChat(activeCall.chatId);
                    acceptCall();
                  }}
                  onDecline={declineCall}
                />
              ) : null}
              {!selectedChatId ? (
                <div className="md:hidden">
                  {searchPanel}
                  {chatsPanel}
                </div>
              ) : messagesLoading ? (
                <div
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Loading messages…
                </div>
              ) : messagesError ? (
                <div
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {messagesError}
                </div>
              ) : messages.length === 0 ? (
                <div
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No messages yet.
                </div>
              ) : (
                messages.map((m) => {
                  const senderId = getSenderId(m);
                  const mine =
                    senderId && user?._id ? senderId === user._id : false;
                  const time = formatTime(m.createdAt || m.sentAt);
                  const status = (m?.status || "").toLowerCase();
                  const meta = m?.meta || {};
                  const fileUrl = resolveFileUrl(meta?.fileUrl);
                  const replyId = (() => {
                    const r = m?.replyTo;
                    if (!r) return "";
                    if (typeof r === "string") return r;
                    if (r?._id) return r._id;
                    return "";
                  })();
                  const replyTarget = replyId
                    ? messagesById.get(String(replyId))
                    : null;
                  const reactionGroups = groupReactions(m?.reactions);
                  const ticks = (() => {
                    if (!mine) return null;
                    if (status === "seen") {
                      return (
                        <span
                          className="ml-1"
                          style={{ color: "var(--accent-green-strong)" }}
                        >
                          ✓✓
                        </span>
                      );
                    }
                    if (status === "delivered") {
                      return <span className="ml-1">✓✓</span>;
                    }
                    if (status === "sent") {
                      return <span className="ml-1">✓</span>;
                    }
                    return null;
                  })();
                  return (
                    <div
                      key={m._id}
                      className={`${
                        mine ? "ml-auto" : ""
                      } w-fit max-w-[80%] rounded-2xl px-3 py-2`}
                      style={{
                        background: mine
                          ? "var(--message-out)"
                          : "var(--message-in)",
                        color: "var(--text-primary)",
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          message: m,
                          mine,
                          fileUrl: fileUrl || "",
                        });
                      }}
                    >
                      {replyTarget ? (
                        <div
                          className="mb-1 rounded-xl px-2 py-1"
                          style={{
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <div
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {getSenderId(replyTarget) === user?._id
                              ? "You"
                              : replyTarget?.sender?.username || "Reply"}
                          </div>
                          <div className="truncate text-[12px]">
                            {pickReplySnippet(replyTarget) || "Message"}
                          </div>
                        </div>
                      ) : null}

                      <div className="text-sm">
                        {m.type === "call" ? (
                          <div>
                            <div className="font-semibold">
                              {m.content || "📞 Call"}
                            </div>
                            <div
                              className="mt-0.5 text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {(meta?.callType || "")
                                .toString()
                                .toUpperCase() || "CALL"}
                              {meta?.callEvent
                                ? ` • ${String(meta.callEvent)}`
                                : ""}
                            </div>
                          </div>
                        ) : m.type === "image" && fileUrl ? (
                          <img
                            src={fileUrl}
                            alt={meta?.fileName || "image"}
                            className="max-h-80 max-w-[260px] rounded-xl"
                            style={{ background: "var(--bg-secondary)" }}
                          />
                        ) : m.type === "video" && fileUrl ? (
                          <video
                            src={fileUrl}
                            controls
                            className="max-h-80 max-w-[260px] rounded-xl"
                          />
                        ) : m.type === "audio" && fileUrl ? (
                          <audio src={fileUrl} controls className="w-64" />
                        ) : m.type === "file" && fileUrl ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {meta?.fileName || m.content || "Download file"}
                          </a>
                        ) : (
                          m.content || (m.type ? `[${m.type}]` : "")
                        )}
                      </div>

                      {reactionGroups.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {reactionGroups.map((g) => (
                            <button
                              key={g.emoji}
                              type="button"
                              className="rounded-full border px-2 py-0.5 text-xs"
                              style={{
                                borderColor: "var(--border-color)",
                                background: "var(--bg-elevated)",
                                color: "var(--text-primary)",
                              }}
                              onClick={async () => {
                                if (!selectedChatId) return;
                                await toggleReaction(
                                  selectedChatId,
                                  m._id,
                                  g.emoji
                                );
                              }}
                              title="Toggle reaction"
                            >
                              {g.emoji} {g.count}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div
                        className="mt-1 text-[11px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <span className="inline-flex items-center">
                          <span>{time}</span>
                          {ticks}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {selectedChatId ? (
            <footer
              className="border-t px-4 py-3"
              style={{
                borderColor: "var(--border-color)",
                background: "var(--bg-secondary)",
              }}
            >
              {replyToId ? (
                <div
                  className="mx-auto mb-2 flex max-w-190 items-start justify-between gap-3 rounded-xl border p-2"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Replying
                    </div>
                    <div
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {replyToMessage
                        ? pickReplySnippet(replyToMessage)
                        : "Message"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      selectedChatId && setReplyTo(selectedChatId, null)
                    }
                    className="h-8 w-8 rounded-full border text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                    }}
                    aria-label="Cancel reply"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : null}

              {pendingAttachment ? (
                <div
                  className="mx-auto mb-2 flex max-w-190 items-center justify-between gap-3 rounded-xl border p-2"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-xs font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {pendingAttachment.file?.name || "Attachment"}
                    </div>

                    <div className="mt-1">
                      {pendingAttachment.kind === "image" &&
                      pendingAttachment.previewUrl ? (
                        <img
                          src={pendingAttachment.previewUrl}
                          alt="preview"
                          className="max-h-32 rounded-lg"
                        />
                      ) : pendingAttachment.kind === "video" &&
                        pendingAttachment.previewUrl ? (
                        <video
                          src={pendingAttachment.previewUrl}
                          controls
                          className="max-h-32 rounded-lg"
                        />
                      ) : pendingAttachment.kind === "audio" &&
                        pendingAttachment.previewUrl ? (
                        <audio src={pendingAttachment.previewUrl} controls />
                      ) : (
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Ready to send
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={clearPendingAttachment}
                      className="h-9 rounded-full border px-3 text-sm font-semibold"
                      style={{
                        borderColor: "var(--border-color)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setAttachError(null);
                        if (!selectedChatId || !pendingAttachment?.file) return;
                        const ok = await sendMediaMessage(
                          selectedChatId,
                          pendingAttachment.file
                        );
                        if (!ok) setAttachError("Failed to send attachment");
                        else clearPendingAttachment();
                      }}
                      className="h-9 rounded-full px-3 text-sm font-semibold"
                      style={{
                        background: "var(--accent-green)",
                        color: "#fff",
                      }}
                      aria-label="Send"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              ) : null}

              <form
                onSubmit={onSend}
                className="mx-auto flex max-w-190 items-center gap-3"
              >
                <div className="shrink-0">
                  <input
                    id="yexo-attach"
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      setAttachError(null);
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f || !selectedChatId) return;
                      setPendingFromFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedChatId) return;
                      document.getElementById("yexo-attach")?.click();
                    }}
                    className="h-10 w-10 rounded-full border text-lg font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      opacity: selectedChatId ? 1 : 0.6,
                    }}
                    disabled={!selectedChatId}
                    aria-disabled={!selectedChatId}
                    aria-label="Attach"
                    title={selectedChatId ? "Attach" : "Select a chat"}
                  >
                    +
                  </button>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedChatId) return;
                      if (recording) stopRecording();
                      else startRecording();
                    }}
                    className="h-10 w-10 rounded-full border text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-color)",
                      background: recording
                        ? "var(--message-out)"
                        : "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      opacity: selectedChatId ? 1 : 0.6,
                    }}
                    disabled={!selectedChatId}
                    aria-disabled={!selectedChatId}
                    aria-label={recording ? "Stop recording" : "Record voice"}
                    title={
                      selectedChatId
                        ? recording
                          ? "Stop"
                          : "Voice"
                        : "Select a chat"
                    }
                  >
                    {recording ? "■" : "🎙"}
                  </button>
                </div>

                <input
                  className="h-10 w-full rounded-full border px-4 text-sm outline-none"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                  }}
                  placeholder={selectedChatId ? "Message" : "Select a chat"}
                  value={draft}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraft(value);
                    if (!selectedChatId) return;
                    if (value && value.trim().length > 0)
                      emitTyping(selectedChatId);
                    else emitStopTyping(selectedChatId);
                  }}
                  disabled={!selectedChatId}
                  aria-disabled={!selectedChatId}
                />
                <button
                  type="submit"
                  className="h-10 rounded-full px-4 text-sm font-semibold"
                  style={{
                    background: "var(--accent-green)",
                    color: "#fff",
                    opacity: selectedChatId ? 1 : 0.6,
                  }}
                  disabled={!selectedChatId}
                  aria-label="Send"
                >
                  ➤
                </button>
              </form>

              {attachError ? (
                <div
                  className="mx-auto mt-2 max-w-190 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {attachError}
                </div>
              ) : null}

              {recordError ? (
                <div
                  className="mx-auto mt-1 max-w-190 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {recordError}
                </div>
              ) : null}
            </footer>
          ) : null}
        </main>
      </div>
    </div>
  );
}
