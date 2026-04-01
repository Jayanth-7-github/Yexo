import React, { useEffect, useState, useRef } from "react";
import {
  View,
  FlatList,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../../constants/endpoints";
import { useThemeStore } from "../../store/theme.store";
import { useMessageStore } from "../../store/message.store";
import { useSocketStore } from "../../store/socket.store";
import { useAuthStore } from "../../store/auth.store";
import { useChatStore } from "../../store/chat.store";
import { ChatHeader } from "../../components/ChatHeader";
import { ChatBubble } from "../../components/ChatBubble";
import { InputBar } from "../../components/InputBar";
import { TypingIndicator } from "../../components/TypingIndicator";
import { Loader } from "../../components/Loader";
import { uploadAPI } from "../../api/upload.api";
import {
  getChatName,
  getChatAvatar,
  isUserOnline,
} from "../../utils/formatMessage";
import Toast from "react-native-toast-message";
import { useCallStore } from "../../store/call.store";
import { useWebRTCCall } from "../../hooks/useWebRTCCall";
import IncomingCallScreen from "../Call/IncomingCallScreen";
import OutgoingCallScreen from "../Call/OutgoingCallScreen";
import ActiveCallScreen from "../Call/ActiveCallScreen";
import { CallBar } from "../../components/CallBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Removed duplicate import of Platform
// WebRTC is not supported in Expo managed workflow

export const ChatRoomScreen = ({ route, navigation }) => {
  const { chat } = route.params;
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const { getMessages, loadMessages, addMessage, markAllAsSeen } =
    useMessageStore();
  const {
    sendMessage,
    typing,
    joinChat,
    leaveChat,
    getTypingUser,
    initiateCall,
    sendCallOffer,
    sendCallAnswer,
    sendCallIceCandidate,
    markMessageSeen,
  } = useSocketStore();
  const { clearUnread } = useChatStore();

  // ---------- CALL STATE (Zustand + WebRTC) ----------
  const { callState, callInfo, setCallState, setCallInfo, resetCall } =
    useCallStore();
  const {
    localStream,
    remoteStream,
    startCall,
    endCall,
    isSocketConnected,
    acceptCall,
    rejectCall,
  } = useWebRTCCall({
    userId: user?._id,
    onCallEvent: (event, from) => {
      // push to local debug log
      setCallDebug((prev) =>
        [{ ts: new Date().toLocaleTimeString(), event, from }, ...prev].slice(
          0,
          12
        )
      );

      if (event === "incoming") {
        setCallState("ringing");
        setCallInfo({
          remoteUserId: from,
          remoteName: chatName,
          isVideo: true,
        });
      } else if (event === "connected") {
        // The remote side answered and caller should transition to in-call
        setCallState("in-call");
        setCallInfo((prev) => ({
          ...prev,
          remoteUserId: from || prev?.remoteUserId,
          remoteName: chatName,
        }));
      }
    },
  });

  // Debug: log socket connection state so we can confirm UI wiring
  useEffect(() => {
    console.log("[ChatRoom] isSocketConnected =>", isSocketConnected);
  }, [isSocketConnected]);

  // Local debug log of signaling events
  const [callDebug, setCallDebug] = useState([]);

  // ---------- UI STATES ----------
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [viewImageUri, setViewImageUri] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [messageOptions, setMessageOptions] = useState(null);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);

  const flatListRef = useRef();
  const typingTimeoutRef = useRef();
  // peerConnection, localStream, remoteStream handled by useWebRTCCall

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const messages = getMessages(chat._id);
  const chatName = getChatName(chat, user?._id);
  const chatAvatar = getChatAvatar(chat, user?._id);
  const online = isUserOnline(chat, user?._id);
  const typingUserId = getTypingUser(chat._id);
  const insets = useSafeAreaInsets();

  // ---------- OUTGOING CALL ----------
  const handleCallVideo = () => {
    const targetUserId = chat.participants.find((p) => p._id !== user._id)?._id;
    setCallState("calling");
    setCallInfo({
      remoteUserId: targetUserId,
      remoteName: chatName,
      isVideo: true,
    });
    startCall(targetUserId, true);
  };

  const handleCallAudio = () => {
    const targetUserId = chat.participants.find((p) => p._id !== user._id)?._id;
    setCallState("calling");
    setCallInfo({
      remoteUserId: targetUserId,
      remoteName: chatName,
      isVideo: false,
    });
    startCall(targetUserId, false);
  };

  // ---------- INITIALIZATION ----------
  useEffect(() => {
    initChat();
    return () => leaveChat(chat._id);
  }, []);

  const initChat = async () => {
    joinChat(chat._id);
    await loadMessages(chat._id);
    setLoading(false);

    await markAllAsSeen(chat._id);
    clearUnread(chat._id);
  };

  // ---------- DEBUG ----------
  useEffect(() => {
    if (messages.length > 0) {
      console.log("Current user ID:", user?._id);
      console.log(
        "First message sender:",
        messages[0].senderId || messages[0].sender?._id
      );
      console.log("Sample message:", messages[0]);
    }
  }, [messages]);

  // ---------- SEND MESSAGE ----------
  const handleSend = (text) => {
    const tempId = `temp_${Date.now()}`;
    const newMessage = {
      _id: tempId,
      chatId: chat._id,
      senderId: user._id,
      type: "text",
      content: text,
      status: "sending",
      createdAt: new Date().toISOString(),
      replyTo: replyTo
        ? {
            _id: replyTo._id,
            senderId: replyTo.senderId || replyTo.sender?._id,
            content: (replyTo.content || replyTo.meta?.fileName || "").slice(
              0,
              140
            ),
          }
        : undefined,
    };

    addMessage(chat._id, newMessage);

    sendMessage({
      chatId: chat._id,
      type: "text",
      content: text,
      tempId,
      replyTo: newMessage.replyTo,
    });

    // clear reply state after sending
    setReplyTo(null);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ---------- TYPING ----------
  const handleTyping = (isTyping) => {
    typing(chat._id, isTyping);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        typing(chat._id, false);
      }, 3000);
    }
  };

  // ---------- ATTACHMENTS ----------
  const handleAttachment = () => {
    if (Platform.OS === "web") handleImagePicker();
    else setShowAttachmentOptions(true);
  };

  const handleCamera = async () => {
    try {
      setShowAttachmentOptions(false);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Toast.show({ type: "error", text1: "Camera permission required" });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0])
        setImagePreview(result.assets[0]);
    } catch (err) {
      Toast.show({ type: "error", text1: "Camera error", text2: err.message });
    }
  };

  const handleImagePicker = async () => {
    try {
      setShowAttachmentOptions(false);
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Toast.show({ type: "error", text1: "Permission required" });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0])
        setImagePreview(result.assets[0]);
    } catch (err) {
      Toast.show({ type: "error", text1: "Picker error", text2: err.message });
    }
  };

  // ---------- UPLOAD IMAGE ----------
  const uploadAndSendImage = async (asset) => {
    try {
      setUploading(true);
      const messageType = asset.type === "video" ? "video" : "image";

      const uploadResult = await uploadAPI.uploadFile(
        {
          uri: asset.uri,
          type: asset.type === "video" ? "video/mp4" : "image/jpeg",
          fileName: asset.uri.split("/").pop(),
        },
        { chatId: chat._id, type: messageType, content: " " }
      );

      const fileUrl = uploadResult.data?.fileUrl;
      const tempId = `temp_${Date.now()}`;

      const newMessage = {
        _id: tempId,
        chatId: chat._id,
        senderId: user._id,
        type: messageType,
        content: " ",
        meta: {
          fileUrl: fileUrl.startsWith("http")
            ? fileUrl
            : `${API_URL}${fileUrl}`,
          fileName: uploadResult.data.fileName,
        },
        status: "sending",
        createdAt: new Date().toISOString(),
      };

      addMessage(chat._id, newMessage);

      sendMessage({
        chatId: chat._id,
        type: messageType,
        content: " ",
        meta: newMessage.meta,
        tempId,
      });

      setUploading(false);
      Toast.show({ type: "success", text1: "File sent" });
    } catch (error) {
      console.error("UPLOAD ERROR:", error);
      setUploading(false);
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: error.response?.data?.message || error.message,
      });
    }
  };

  // ---------- MESSAGE LONG PRESS ----------
  const handleMessageLongPress = (msg) => setMessageOptions(msg);

  const handleDeleteMessage = () =>
    Toast.show({ type: "info", text1: "Delete coming soon" });

  const handleCopyMessage = () =>
    Toast.show({ type: "success", text1: "Copied" });

  const handleForwardMessage = () =>
    Toast.show({ type: "info", text1: "Forward coming soon" });

  const handleReportMessage = () =>
    Toast.show({ type: "info", text1: "Report coming soon" });

  // ---------- AUTO SEEN ----------
  useEffect(() => {
    if (messages.length > 0 && user?._id) {
      messages.forEach((msg) => {
        if (msg.senderId !== user._id && msg.status !== "seen") {
          markMessageSeen(msg._id, chat._id);
          useMessageStore
            .getState()
            .updateMessageStatus(chat._id, msg._id, "seen");
        }
      });
    }
  }, [messages]);

  // ---------- CALL HANDLERS ----------
  // Signaling is handled by the `useWebRTCCall` hook; legacy socket listeners
  // and inline peer connection code were removed to avoid duplicate handling
  // and race conditions. The hook exposes `localStream`/`remoteStream` and
  // manages the PeerConnection lifecycle.

  // ---------- LOADING ----------
  if (loading) return <Loader />;

  // ---------- UI / RENDER ----------
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {callState === "ringing" && callInfo && (
        <CallBar
          callerName={callInfo.remoteName}
          onJoin={() => {
            // Trigger the WebRTC accept flow, then set UI state
            try {
              acceptCall && acceptCall();
            } catch (e) {
              console.warn("acceptCall error:", e);
            }
            setCallState("in-call");
            // Inject call log message for joining
            addMessage(chat._id, {
              _id: `call_join_${Date.now()}`,
              chatId: chat._id,
              senderId: user._id,
              type: "call-log",
              content: `${user.name || "You"} joined the call`,
              status: "delivered",
              createdAt: new Date().toISOString(),
            });
          }}
          onDismiss={() => {
            // Reject the incoming call and clear UI
            try {
              rejectCall ? (rejectCall(), resetCall()) : resetCall();
            } catch (e) {
              console.warn("rejectCall error:", e);
              resetCall();
            }
            // Inject call log message for missed/ended call
            addMessage(chat._id, {
              _id: `call_end_${Date.now()}`,
              chatId: chat._id,
              senderId: user._id,
              type: "call-log",
              content: `${user.name || "You"} missed/ended the call`,
              status: "delivered",
              createdAt: new Date().toISOString(),
            });
          }}
        />
      )}

      {/* Call UI Screens */}
      {callState === "ringing" && callInfo && (
        <IncomingCallScreen
          callerName={callInfo.remoteName}
          onAccept={() => {
            try {
              acceptCall && acceptCall();
            } catch (e) {
              console.warn("acceptCall error:", e);
            }
            setCallState("in-call");
          }}
          onReject={() => {
            try {
              rejectCall ? (rejectCall(), resetCall()) : resetCall();
            } catch (e) {
              console.warn("rejectCall error:", e);
              resetCall();
            }
          }}
        />
      )}
      {callState === "calling" && callInfo && (
        <OutgoingCallScreen
          calleeName={callInfo.remoteName}
          onCancel={resetCall}
        />
      )}
      {callState === "in-call" && callInfo && (
        <ActiveCallScreen
          localStream={localStream}
          remoteStream={remoteStream}
          remoteName={callInfo.remoteName}
          isVideo={callInfo.isVideo}
          onEndCall={resetCall}
        />
      )}

      {/* Main Chat UI (hidden if in call) */}
      {callState === "idle" || callState === "ended" ? (
        <>
          <ChatHeader
            title={chatName}
            subtitle={online ? "online" : "offline"}
            avatar={chatAvatar}
            online={online}
            onBack={() => navigation.goBack()}
            onPress={() =>
              Toast.show({ type: "info", text1: "Profile feature coming soon" })
            }
            onCallVideo={handleCallVideo}
            onCallAudio={handleCallAudio}
            callDisabled={!isSocketConnected}
            socketConnected={isSocketConnected}
          />

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                if (item.type === "call-log") {
                  return (
                    <View style={{ alignItems: "center", marginVertical: 6 }}>
                      <View
                        style={{
                          backgroundColor: "#e0e0e0",
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          maxWidth: "80%",
                        }}
                      >
                        <Text
                          style={{
                            color: "#333",
                            fontStyle: "italic",
                            fontSize: 14,
                          }}
                        >
                          {item.content}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return (
                  <ChatBubble
                    message={item}
                    isOwn={(item.senderId || item.sender?._id) === user._id}
                    onLongPress={handleMessageLongPress}
                    onImagePress={(imageUrl) => setViewImageUri(imageUrl)}
                    onReply={(msg) => {
                      setReplyTo({
                        _id: msg._id,
                        senderId: msg.senderId || msg.sender?._id,
                        senderName: msg.sender?.name || msg.senderName,
                        content: msg.content || msg.meta?.fileName || "",
                      });
                      // ensure messages are scrolled to bottom so input is visible
                      setTimeout(
                        () =>
                          flatListRef.current?.scrollToEnd({ animated: true }),
                        50
                      );
                    }}
                  />
                );
              }}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              onLayout={() => flatListRef.current?.scrollToEnd()}
            />

            {typingUserId && <TypingIndicator username={chatName} />}

            {/* Bottom bar: reply preview + input grouped to avoid overlap */}
            <View
              style={[
                styles.bottomBar,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                },
              ]}
            >
              {replyTo && (
                <View style={styles.replyPreviewContainer}>
                  <View style={styles.replyPreviewTextContainer}>
                    <Text
                      style={[
                        styles.replyPreviewSender,
                        { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {replyTo.senderName ||
                        (replyTo.senderId === user?._id
                          ? "You"
                          : replyTo.senderId)}
                    </Text>
                    <Text
                      style={[
                        styles.replyPreviewSnippet,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {replyTo.content || ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.replyPreviewClose}
                    onPress={() => setReplyTo(null)}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}

              <InputBar
                onSend={handleSend}
                onAttachment={handleAttachment}
                onTyping={handleTyping}
                bottomInset={insets.bottom}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />
            </View>
          </KeyboardAvoidingView>

          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}

          {/* Image Preview */}
          {/* Send-preview modal (used when selecting/taking new images) */}
          <Modal
            visible={!!imagePreview}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setImagePreview(null)}
          >
            <View style={styles.previewModal}>
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: imagePreview?.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={[styles.previewButton, styles.cancelButton]}
                    onPress={() => setImagePreview(null)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.previewButton, styles.sendButton]}
                    onPress={() => {
                      const asset = imagePreview;
                      setImagePreview(null);
                      uploadAndSendImage(asset);
                    }}
                  >
                    <Text style={styles.buttonText}>Send</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick reactions */}
                <View style={styles.reactionsRow}>
                  {["👍", "❤️", "😂", "😮", "😢", "👎"].map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reactionButton}
                      onPress={() => {
                        useMessageStore
                          .getState()
                          .toggleReaction(
                            messageOptions.chatId || chat._id,
                            messageOptions._id,
                            emoji,
                            user?._id
                          );
                        setMessageOptions(null);
                      }}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>

          {/* View-only image viewer for existing chat images */}
          <Modal
            visible={!!viewImageUri}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setViewImageUri(null)}
          >
            <View style={styles.viewerModalOverlay}>
              <TouchableOpacity
                style={styles.viewerBackdrop}
                activeOpacity={1}
                onPress={() => setViewImageUri(null)}
              />

              <View style={styles.viewerContainer} pointerEvents="box-none">
                <Image
                  source={{ uri: viewImageUri }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />

                <TouchableOpacity
                  onPress={() => setViewImageUri(null)}
                  style={[
                    styles.viewerCloseButton,
                    { top: 20 + insets.top, right: 16 },
                  ]}
                  accessibilityLabel="Close image preview"
                >
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Message Options */}
          <Modal
            visible={!!messageOptions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMessageOptions(null)}
          >
            <TouchableOpacity
              style={styles.messageOptionsOverlay}
              activeOpacity={1}
              onPress={() => setMessageOptions(null)}
            >
              <View
                style={[
                  styles.messageOptionsContainer,
                  {
                    marginHorizontal: 0,
                    width: "100%",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    paddingBottom: 16 + insets.bottom,
                    paddingTop: 12,
                  },
                ]}
              >
                <View style={styles.messageOptionsHeader}>
                  <Text style={styles.messageOptionsTitle}>
                    Message Options
                  </Text>
                  <Text style={styles.messageOptionsSubtitle}>
                    {messageOptions?.type === "text"
                      ? (messageOptions?.content || "").substring(0, 40) + "..."
                      : "Image message"}
                  </Text>
                </View>
                {/* Quick reactions (small row) */}
                <View style={styles.reactionRowInline}>
                  {["👍", "❤️", "😂", "😮", "😢", "👎"].map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reactionInlineButton}
                      onPress={() => {
                        useMessageStore
                          .getState()
                          .toggleReaction(
                            messageOptions.chatId || chat._id,
                            messageOptions._id,
                            emoji,
                            user?._id
                          );
                        setMessageOptions(null);
                      }}
                    >
                      <Text style={styles.reactionInlineEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.messageOptionsButtonsColumn}>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      setReplyTo({
                        _id: messageOptions._id,
                        senderId:
                          messageOptions.senderId || messageOptions.sender?._id,
                        senderName:
                          messageOptions.sender?.name ||
                          messageOptions.senderName ||
                          (messageOptions.senderId === user?._id ? "You" : ""),
                        content:
                          messageOptions.content ||
                          messageOptions.meta?.fileName ||
                          "",
                      });
                      setMessageOptions(null);
                    }}
                  >
                    <Text style={styles.optionRowText}>REPLY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      handleCopyMessage();
                      setMessageOptions(null);
                    }}
                  >
                    <Text style={styles.optionRowText}>COPY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      handleForwardMessage();
                      setMessageOptions(null);
                    }}
                  >
                    <Text style={styles.optionRowText}>FORWARD</Text>
                  </TouchableOpacity>

                  {messageOptions?.senderId === user?._id ? (
                    <TouchableOpacity
                      style={[styles.optionRow, styles.deleteRow]}
                      onPress={() => {
                        handleDeleteMessage();
                        setMessageOptions(null);
                      }}
                    >
                      <Text
                        style={[styles.optionRowText, styles.deleteRowText]}
                      >
                        DELETE
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.optionRow, styles.deleteRow]}
                      onPress={() => {
                        handleReportMessage();
                        setMessageOptions(null);
                      }}
                    >
                      <Text
                        style={[styles.optionRowText, styles.deleteRowText]}
                      >
                        REPORT
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Attachment Options */}
          <Modal
            visible={showAttachmentOptions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowAttachmentOptions(false)}
          >
            <TouchableOpacity
              style={styles.attachmentOverlay}
              activeOpacity={1}
              onPress={() => setShowAttachmentOptions(false)}
            >
              <View style={styles.attachmentContainer}>
                <View style={styles.attachmentHeader}>
                  <Text style={styles.attachmentTitle}>Send Attachment</Text>
                  <Text style={styles.attachmentSubtitle}>
                    Choose an option
                  </Text>
                </View>

                <View style={styles.attachmentOptionsGrid}>
                  <TouchableOpacity
                    style={styles.attachmentOption}
                    onPress={handleCamera}
                  >
                    <View
                      style={[
                        styles.attachmentIconContainer,
                        { backgroundColor: "#FF3B30" },
                      ]}
                    >
                      <Ionicons name="camera" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.attachmentOptionText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attachmentOption}
                    onPress={handleImagePicker}
                  >
                    <View
                      style={[
                        styles.attachmentIconContainer,
                        { backgroundColor: "#007AFF" },
                      ]}
                    >
                      <Ionicons name="images" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.attachmentOptionText}>Gallery</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.attachmentCancelButton}
                  onPress={() => setShowAttachmentOptions(false)}
                >
                  <Text style={styles.attachmentCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Removed local/remote stream indicators from chat screen UI */}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  previewModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    width: "92%",
    maxWidth: 480,
    aspectRatio: 0.75,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.44,
        shadowRadius: 10.32,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: "0 8px 32px rgba(0,0,0,0.44)",
      },
    }),
  },
  previewImage: {
    width: "100%",
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  viewerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  viewerCloseButton: {
    position: "absolute",
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    borderRadius: 20,
  },
  previewActions: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  previewButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {},
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      },
    }),
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  sendButton: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  messageOptionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  debugOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 8,
    zIndex: 9999,
  },
  debugTitle: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 4,
  },
  debugLine: {
    color: "#ddd",
    fontSize: 12,
  },
  debugState: {
    color: "#fff",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  messageOptionsContainer: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {},
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 -2px 16px rgba(0,0,0,0.1)",
      },
    }),
  },
  messageOptionsHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  messageOptionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 6,
  },
  messageOptionsSubtitle: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 18,
  },
  messageOptionsButtons: {
    paddingVertical: 8,
    // legacy: kept for compatibility; column layout implemented in messageOptionsButtonsColumn
  },
  messageOptionsButtonsColumn: {
    width: "100%",
    backgroundColor: "#fff",
  },
  replyPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  replyPreviewTextContainer: {
    flex: 1,
  },
  replyPreviewSender: {
    fontWeight: "700",
    fontSize: 13,
  },
  replyPreviewSnippet: {
    fontSize: 13,
  },
  replyPreviewClose: {
    paddingLeft: 12,
  },
  bottomBar: {
    flexShrink: 0,
    borderTopWidth: 1,
  },
  reactionsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
    marginBottom: 8,
  },
  reactionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionRowInline: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  reactionInlineButton: {
    padding: 8,
    borderRadius: 20,
  },
  reactionInlineEmoji: {
    fontSize: 20,
  },
  optionRow: {
    width: "100%",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  optionRowText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    letterSpacing: 0.6,
  },
  deleteButton: {
    backgroundColor: "#fff",
  },
  deleteButtonText: {
    color: "#ff3b30",
  },
  deleteRow: {
    backgroundColor: "#fff",
  },
  deleteRowText: {
    color: "#ff3b30",
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  attachmentOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  attachmentContainer: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {},
      android: {
        elevation: 8,
      },
    }),
  },
  attachmentHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  attachmentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
    marginTop: 8,
  },
  attachmentOptionsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  attachmentOption: {
    alignItems: "center",
  },
  attachmentIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  attachmentOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333333",
  },
  attachmentCancelButton: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    alignItems: "center",
  },
  attachmentCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  },
});
