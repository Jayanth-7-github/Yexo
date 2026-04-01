import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import axios from "../api/axios";
import { ENDPOINTS } from "../constants/endpoints";
import storageService from "./storage.service";

// Configure notification behavior only for native platforms
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Register for push notifications
  async registerForPushNotifications() {
    // Skip push notifications on web platform
    if (Platform.OS === "web") {
      console.log("Push notifications not supported on web");
      return null;
    }

    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return null;
      }

      try {
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
          })
        ).data;

        this.expoPushToken = token;
        await storageService.savePushToken(token);

        // Register token with backend
        await this.registerTokenWithBackend(token);

        return token;
      } catch (error) {
        console.error("Error getting push token:", error);
        return null;
      }
    } else {
      console.log("Must use physical device for Push Notifications");
      return null;
    }
  }

  // Register token with backend
  async registerTokenWithBackend(token) {
    try {
      await axios.post(ENDPOINTS.REGISTER_PUSH_TOKEN, {
        token,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error("Error registering push token with backend:", error);
    }
  }

  // Add notification received listener
  addNotificationReceivedListener(callback) {
    if (Platform.OS === "web") return null;

    this.notificationListener =
      Notifications.addNotificationReceivedListener(callback);
    return this.notificationListener;
  }

  // Add notification response listener (when user taps notification)
  addNotificationResponseListener(callback) {
    if (Platform.OS === "web") return null;

    this.responseListener =
      Notifications.addNotificationResponseReceivedListener(callback);
    return this.responseListener;
  }

  // Remove listeners
  removeListeners() {
    if (Platform.OS === "web") return;

    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  // Schedule local notification
  async scheduleNotification(title, body, data = {}) {
    if (Platform.OS === "web") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Show immediately
    });
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    if (Platform.OS === "web") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount() {
    if (Platform.OS === "web") return 0;
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count) {
    if (Platform.OS === "web") return;
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear badge
  async clearBadge() {
    if (Platform.OS === "web") return;
    await Notifications.setBadgeCountAsync(0);
  }
}

export default new NotificationService();
