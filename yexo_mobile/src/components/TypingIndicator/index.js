import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeStore } from "../../store/theme.store";

export const TypingIndicator = ({ username }) => {
  const { colors } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.text, { color: colors.typing }]}>
        {username || "Someone"} is typing
      </Text>
      <View style={styles.dots}>
        <View style={[styles.dot, { backgroundColor: colors.typing }]} />
        <View style={[styles.dot, { backgroundColor: colors.typing }]} />
        <View style={[styles.dot, { backgroundColor: colors.typing }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  text: {
    fontSize: 13,
    fontStyle: "italic",
  },
  dots: {
    flexDirection: "row",
    marginLeft: 8,
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
