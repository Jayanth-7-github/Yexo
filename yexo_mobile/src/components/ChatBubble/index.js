import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from "react-native";
import { useThemeStore } from "../../store/theme.store";
import { useAuthStore } from "../../store/auth.store";
import { useMessageStore } from "../../store/message.store";
import { formatMessageTime } from "../../utils/time";
import { Ionicons } from "@expo/vector-icons";

export const ChatBubble = ({
  message,
  isOwn,
  onLongPress,
  onImagePress,
  onReply,
}) => {
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const messageStore = useMessageStore.getState();
  const pan = useRef(new Animated.Value(0)).current;
  const [showIndicator, setShowIndicator] = useState(false);
  const lastTap = useRef(null);

  const THRESHOLD = 80;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // start responding when horizontal move is significant
        return (
          Math.abs(gestureState.dx) > 6 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderGrant: () => {
        pan.setOffset(pan._value || 0);
        pan.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        // allow only horizontal movement
        const dx = Math.max(-120, Math.min(120, gs.dx));
        pan.setValue(dx);
        setShowIndicator(Math.abs(dx) > 24);
      },
      onPanResponderRelease: (_, gs) => {
        const dx = gs.dx || 0;
        // if swiped right (dx > threshold) or left (dx < -threshold) trigger reply
        if (dx > THRESHOLD || dx < -THRESHOLD) {
          Animated.sequence([
            Animated.timing(pan, {
              toValue: dx > 0 ? 60 : -60,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.timing(pan, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowIndicator(false);
            onReply && onReply(message);
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start(() => setShowIndicator(false));
        }
      },
    })
  ).current;

  const renderContent = () => {
    switch (message.type) {
      case "text":
        return <Text style={styles.messageText}>{message.content}</Text>;

      case "image":
        const imageUrl = message.meta?.fileUrl || message.fileUrl;
        console.log("=== IMAGE BUBBLE ===");
        console.log("Message ID:", message._id);
        console.log("Message type:", message.type);
        console.log("Image URL:", imageUrl);
        console.log("Full message:", JSON.stringify(message, null, 2));

        return (
          <View>
            {imageUrl ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onImagePress && onImagePress(imageUrl)}
                onLongPress={() => onLongPress && onLongPress(message)}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={(e) =>
                    console.error("Image load error:", e.nativeEvent.error)
                  }
                  onLoad={() =>
                    console.log("Image loaded successfully:", imageUrl)
                  }
                />
              </TouchableOpacity>
            ) : (
              <Text style={styles.messageText}>No image URL</Text>
            )}
            {message.content && message.content.trim() && (
              <Text style={[styles.messageText, { marginTop: 5 }]}>
                {message.content}
              </Text>
            )}
          </View>
        );

      case "video":
        return (
          <View style={styles.videoContainer}>
            <Ionicons name="play-circle" size={50} color="#FFF" />
            {message.content && (
              <Text style={[styles.messageText, { marginTop: 5 }]}>
                {message.content}
              </Text>
            )}
          </View>
        );

      case "audio":
        return (
          <View style={styles.audioContainer}>
            <Ionicons name="mic" size={24} color={colors.text} />
            <Text style={[styles.messageText, { marginLeft: 10 }]}>
              Audio message
            </Text>
          </View>
        );

      case "file":
        return (
          <View style={styles.fileContainer}>
            <Ionicons name="document" size={24} color={colors.text} />
            <Text style={[styles.messageText, { marginLeft: 10 }]}>
              {message.meta?.fileName || "File"}
            </Text>
          </View>
        );

      default:
        return <Text style={styles.messageText}>{message.content}</Text>;
    }
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case "sent":
        return (
          <Ionicons name="checkmark" size={16} color={colors.textSecondary} />
        );
      case "delivered":
        return (
          <Ionicons
            name="checkmark-done"
            size={16}
            color={colors.textSecondary}
          />
        );
      case "seen":
        return (
          <Ionicons name="checkmark-done" size={16} color={colors.secondary} />
        );
      default:
        return (
          <Ionicons
            name="time-outline"
            size={16}
            color={colors.textSecondary}
          />
        );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={() => onLongPress && onLongPress(message)}
      onPress={() => {
        const now = Date.now();
        if (lastTap.current && now - lastTap.current < 300) {
          // double tap detected -> toggle heart reaction
          try {
            messageStore.toggleReaction(
              message.chatId || message.chat || message._chatId,
              message._id,
              "❤️",
              user?._id
            );
          } catch (e) {
            console.warn("toggleReaction failed:", e);
          }
          lastTap.current = null;
        } else {
          lastTap.current = now;
          // clear after timeout
          setTimeout(() => (lastTap.current = null), 350);
        }
      }}
      style={[
        styles.container,
        isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.bubble,
          {
            backgroundColor: isOwn
              ? colors.messageBubbleOwn
              : colors.messageBubbleOther,
            transform: [{ translateX: pan }],
          },
        ]}
      >
        {showIndicator && (
          <View
            style={[
              styles.swipeIndicator,
              isOwn ? styles.indicatorRight : styles.indicatorLeft,
            ]}
          >
            <Text style={styles.swipeText}>Reply</Text>
          </View>
        )}
        {message.replyTo && (
          <View
            style={[styles.replyPreview, { borderLeftColor: colors.primary }]}
          >
            <Text style={[styles.replySender, { color: colors.textSecondary }]}>
              {message.replyTo.senderName || message.replyTo.senderId}
            </Text>
            <Text
              style={[styles.replySnippet, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {message.replyTo.content}
            </Text>
          </View>
        )}

        {renderContent()}

        {/* inline picker removed: double-tap still toggles ❤️ */}

        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <View style={styles.reactionsContainer}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <View key={emoji} style={styles.reactionChip}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text
                  style={[
                    styles.reactionCount,
                    { color: colors.textSecondary },
                  ]}
                >
                  {users.length}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.footer}>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatMessageTime(message.createdAt)}
          </Text>
          {getStatusIcon()}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    marginHorizontal: 10,
  },
  ownMessage: {
    alignItems: "flex-end",
  },
  otherMessage: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 10,
    padding: 10,
    paddingBottom: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 6,
  },
  replySender: {
    fontSize: 12,
    fontWeight: "700",
  },
  replySnippet: {
    fontSize: 13,
  },
  reactionsContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginRight: 8,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  reactionCount: {
    fontSize: 12,
  },
  swipeIndicator: {
    position: "absolute",
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.12)",
    zIndex: 5,
  },
  indicatorLeft: {
    left: -70,
  },
  indicatorRight: {
    right: -70,
  },
  swipeText: {
    fontSize: 13,
    color: "#fff",
  },
  videoContainer: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 5,
    gap: 5,
  },
  time: {
    fontSize: 11,
  },
  reactionIconContainer: {
    position: "absolute",
    bottom: 6,
    right: 6,
    zIndex: 30,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 6,
    borderRadius: 16,
  },
  reactionPicker: {
    position: "absolute",
    bottom: 44,
    zIndex: 40,
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
  },
  reactionPickerButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  reactionPickerEmoji: {
    fontSize: 18,
  },
});
