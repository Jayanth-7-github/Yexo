import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useThemeStore } from "../../store/theme.store";
import { useChatStore } from "../../store/chat.store";
import { chatAPI } from "../../api/chat.api";
import { Avatar } from "../../components/Avatar";

export const ContactsScreen = ({ navigation }) => {
  const { colors } = useThemeStore();
  const { createChat } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Auto-search with debounce
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          setSearching(true);
          console.log("Searching contacts for:", searchQuery);
          const response = await chatAPI.searchUsers(searchQuery);
          console.log("Contact search response:", response);
          const data =
            response.users || response.data?.users || response.data || response;
          console.log("Contact search results:", data);
          setSearchResults(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleStartChat = async (user) => {
    try {
      const result = await createChat({
        userId: user._id,
      });

      if (result.success) {
        Toast.show({
          type: "success",
          text1: "Chat Created",
        });
        const chatData = result.chat.data || result.chat;
        navigation.navigate("Chats");
        navigation.navigate("ChatRoom", { chat: chatData });
      } else {
        Toast.show({
          type: "error",
          text1: "Failed to create chat",
          text2: result.error,
        });
      }
    } catch (error) {
      console.error("Create chat error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to start chat",
      });
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.userItem, { borderBottomColor: colors.border }]}
      onPress={() => handleStartChat(item)}
    >
      <Avatar uri={item.avatar} name={item.username} size={50} />
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.text }]}>
          {item.username}
        </Text>
        {item.email && (
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {item.email}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
      </View>

      <View
        style={[styles.searchContainer, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search users by username or email..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searching && (
          <Ionicons name="hourglass" size={20} color={colors.primary} />
        )}
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery
                ? "No users found"
                : "Search for users to start a chat"}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  email: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
