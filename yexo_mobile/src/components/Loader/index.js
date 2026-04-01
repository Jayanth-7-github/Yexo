import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useThemeStore } from "../../store/theme.store";

export const Loader = ({ size = "large", color }) => {
  const { colors } = useThemeStore();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
