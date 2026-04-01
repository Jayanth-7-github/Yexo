import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useThemeStore } from "./src/store/theme.store";

export default function App() {
  const { isDark } = useThemeStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark() ? "light" : "dark"} />
      <AppNavigator />
      <Toast />
    </GestureHandlerRootView>
  );
}
