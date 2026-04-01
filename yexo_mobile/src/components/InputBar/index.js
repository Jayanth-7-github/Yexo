import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../store/theme.store";

export const InputBar = ({
  onSend,
  onAttachment,
  onTyping,
  bottomInset,
  replyTo,
  onCancelReply,
}) => {
  const { colors } = useThemeStore();
  const [message, setMessage] = useState("");
  const inputRef = useRef();

  const handleChangeText = (text) => {
    setMessage(text);
    if (onTyping) {
      onTyping(text.length > 0);
    }
  };

  const handleSend = () => {
    if (message.trim().length > 0) {
      onSend(message.trim());
      setMessage("");
      if (onTyping) {
        onTyping(false);
      }
    }
  };

  useEffect(() => {
    // when replyTo is set, focus the text input so user can start typing reply immediately
    if (replyTo) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [replyTo]);

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      paddingBottom:
        Platform.OS === "ios"
          ? 12 + (bottomInset ? bottomInset : 0)
          : bottomInset
          ? bottomInset
          : 8,
    },
  ];

  return (
    <View style={containerStyle}>
      <TouchableOpacity style={styles.iconButton} onPress={onAttachment}>
        <Ionicons name="attach-outline" size={26} color={colors.primary} />
      </TouchableOpacity>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            color: colors.text,
          },
        ]}
        placeholder="Type a message..."
        placeholderTextColor={colors.textSecondary}
        value={message}
        onChangeText={handleChangeText}
        ref={inputRef}
        multiline
        maxLength={1000}
      />

      <TouchableOpacity
        style={[
          styles.sendButton,
          { backgroundColor: message.trim() ? colors.primary : colors.border },
        ]}
        onPress={handleSend}
        disabled={!message.trim()}
      >
        <Ionicons name="send" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        paddingBottom: 20,
      },
    }),
  },
  iconButton: {
    padding: 5,
    marginRight: 5,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  replyTextContainer: {
    flex: 1,
  },
  replySender: {
    fontWeight: "700",
    fontSize: 13,
  },
  replySnippet: {
    fontSize: 13,
  },
  replyClose: {
    paddingLeft: 8,
  },
});
