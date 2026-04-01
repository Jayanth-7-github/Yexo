import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useAuthStore } from "../store/auth.store";
import { useSocketStore } from "../store/socket.store";
import { useThemeStore } from "../store/theme.store";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ChatRoomScreen } from "../screens/Chat/ChatRoomScreen";
import notificationService from "../services/notification.service";

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { initSocket, disconnect } = useSocketStore();
  const { initTheme, colors } = useThemeStore();
  const navigationRef = useRef();

  useEffect(() => {
    // Initialize theme and load user
    const init = async () => {
      await initTheme();
      await loadUser();
    };
    init();
  }, []);

  useEffect(() => {
    // Initialize socket if authenticated
    if (isAuthenticated) {
      initSocket();

      // Register for push notifications (skip on web)
      if (Platform.OS !== "web") {
        notificationService.registerForPushNotifications();

        // Add notification listeners
        notificationService.addNotificationReceivedListener((notification) => {
          console.log("Notification received:", notification);
        });

        notificationService.addNotificationResponseListener((response) => {
          const data = response.notification.request.content.data;
          if (data.type === "call" && data.chatId) {
            // Navigate to ChatRoomScreen with chatId (or to a dedicated call screen if you have one)
            navigationRef.current?.navigate("ChatRoom", {
              chat: { _id: data.chatId, ...data.chatInfo },
              // You can pass more call info here if needed
            });
          }
        });
      }
    } else {
      // Disconnect socket when not authenticated
      disconnect();
    }

    return () => {
      if (Platform.OS !== "web") {
        notificationService.removeListeners();
      }
    };
  }, [isAuthenticated]);

  // Show splash screen while loading
  if (isLoading) {
    return (
      <View
        style={[styles.splashContainer, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.logo}>Yexo</Text>
        <Text style={styles.tagline}>Connect. Chat. Share.</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: colors.background === "#0B141A",
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.secondary,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={AuthNavigator} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
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
