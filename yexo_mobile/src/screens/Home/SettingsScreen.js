import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../store/theme.store";
import { useAuthStore } from "../../store/auth.store";
import { Avatar } from "../../components/Avatar";

export const SettingsScreen = ({ navigation }) => {
  const { colors, theme, setTheme, isDark } = useThemeStore();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    // Use platform-specific confirmation dialog
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (!confirmed) return;
    } else {
      // Use Alert.alert for mobile
      Alert.alert("Logout", "Are you sure you want to logout?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            console.log("User confirmed logout");
            await logout();
          },
        },
      ]);
      return;
    }

    console.log("User confirmed logout");
    await logout();
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={colors.primary} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.settingSubtitle, { color: colors.textSecondary }]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement ||
        (onPress && (
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.textSecondary}
          />
        ))}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView>
        {/* Profile Section */}
        <View
          style={[styles.profileSection, { backgroundColor: colors.surface }]}
        >
          <Avatar uri={user?.avatar} name={user?.username} size={80} />
          <Text style={[styles.profileName, { color: colors.text }]}>
            {user?.username}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>
          <TouchableOpacity
            style={[styles.editButton, { borderColor: colors.primary }]}
            onPress={() => {
              // Navigate to edit profile
              Alert.alert("Coming Soon", "Edit profile feature coming soon");
            }}
          >
            <Text style={[styles.editButtonText, { color: colors.primary }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            APPEARANCE
          </Text>
          <SettingItem
            icon="moon"
            title="Dark Mode"
            subtitle={isDark() ? "Enabled" : "Disabled"}
            rightElement={
              <Switch
                value={isDark()}
                onValueChange={(value) => setTheme(value ? "dark" : "light")}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            }
          />
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            NOTIFICATIONS
          </Text>
          <SettingItem
            icon="notifications"
            title="Push Notifications"
            subtitle="Manage notification preferences"
            onPress={() =>
              Alert.alert("Coming Soon", "Notification settings coming soon")
            }
          />
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PRIVACY & SECURITY
          </Text>
          <SettingItem
            icon="lock-closed"
            title="Privacy"
            subtitle="Block contacts, change privacy settings"
            onPress={() =>
              Alert.alert("Coming Soon", "Privacy settings coming soon")
            }
          />
          <SettingItem
            icon="shield-checkmark"
            title="Security"
            subtitle="Change password, two-factor authentication"
            onPress={() =>
              Alert.alert("Coming Soon", "Security settings coming soon")
            }
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ABOUT
          </Text>
          <SettingItem
            icon="information-circle"
            title="About Yexo"
            subtitle="Version 1.0.0"
            onPress={() =>
              Alert.alert("Yexo", "A modern chat application\nVersion 1.0.0")
            }
          />
          <SettingItem
            icon="help-circle"
            title="Help & Support"
            onPress={() =>
              Alert.alert("Coming Soon", "Help & support coming soon")
            }
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={24} color="#FFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 15,
  },
  profileEmail: {
    fontSize: 16,
    marginTop: 5,
  },
  editButton: {
    marginTop: 15,
    paddingHorizontal: 30,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 3,
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 10,
  },
  logoutText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
});
