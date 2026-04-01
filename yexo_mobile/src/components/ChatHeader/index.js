import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../store/theme.store";
import { Avatar } from "../Avatar";

export const ChatHeader = ({
  title,
  subtitle,
  avatar,
  online,
  onPress,
  onBack,
  onCallVideo,
  onCallAudio,
  callDisabled,
  socketConnected,
}) => {
  const { colors } = useThemeStore();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
        },
      ]}
    >
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.userInfo}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Avatar uri={avatar} name={title} size={40} online={online} />
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        {/* Connection indicator: green when connected, red when disconnected */}
        <View
          style={[
            styles.connectionDot,
            socketConnected ? styles.connected : styles.disconnected,
          ]}
        />
        <TouchableOpacity
          style={[styles.iconButton, callDisabled && { opacity: 0.5 }]}
          onPress={() => {
            if (!callDisabled) {
              console.log("Video call button pressed");
              onCallVideo && onCallVideo();
            }
          }}
          disabled={callDisabled}
        >
          <Ionicons name="videocam" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, callDisabled && { opacity: 0.5 }]}
          onPress={() => {
            if (!callDisabled) {
              console.log("Audio call button pressed");
              onCallAudio && onCallAudio();
            }
          }}
          disabled={callDisabled}
        >
          <Ionicons name="call" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    color: "#E0E0E0",
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
  },
  iconButton: {
    padding: 8,
    marginLeft: 5,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    alignSelf: "center",
  },
  connected: {
    backgroundColor: "#4CD964",
  },
  disconnected: {
    backgroundColor: "#FF3B30",
  },
});
