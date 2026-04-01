import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { useThemeStore } from "../../store/theme.store";

export const Avatar = ({ uri, name, size = 50, online = false }) => {
  const { colors } = useThemeStore();

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, backgroundColor: "#6C63FF" },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {online && (
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: colors.online,
              borderColor: colors.surface,
              width: size * 0.25,
              height: size * 0.25,
              right: size * 0.05,
              bottom: size * 0.05,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    borderRadius: 999,
  },
  placeholder: {
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  onlineDot: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
  },
});
