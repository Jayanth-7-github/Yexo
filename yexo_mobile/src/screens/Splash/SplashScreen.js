import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useThemeStore } from "../../store/theme.store";
import { useAuthStore } from "../../store/auth.store";

export const SplashScreen = ({ navigation }) => {
  const { colors } = useThemeStore();
  const { loadUser, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await loadUser();
  };

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigation.replace("Main");
      } else {
        navigation.replace("Auth");
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Text style={styles.logo}>Yexo</Text>
      <Text style={styles.tagline}>Connect. Chat. Share.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: "#E0E0E0",
  },
});
