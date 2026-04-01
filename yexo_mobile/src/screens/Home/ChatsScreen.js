import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../store/theme.store";
import { useChatStore } from "../../store/chat.store";
import { useAuthStore } from "../../store/auth.store";
import { chatAPI } from "../../api/chat.api";
import { Avatar } from "../../components/Avatar";
import { Loader } from "../../components/Loader";
import {
  getChatName,
  getChatAvatar,
  isUserOnline,
  getMessagePreview,
} from "../../utils/formatMessage";
import { formatChatTime } from "../../utils/time";

export const ChatsScreen = ({ navigation }) => {
  const { colors } = useThemeStore();
  const { chats, loadChats, isLoading, error } = useChatStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log("ChatsScreen mounted, loading chats...");
    console.log("User:", user);
    loadChats();
  }, []);

  // Log when chats change
  useEffect(() => {
    console.log("=== ChatsScreen - Chats Updated ===");
    console.log("Total chats:", chats?.length || 0);
    console.log("Is array?", Array.isArray(chats));
    console.log("isLoading:", isLoading);
    console.log("error:", error);
    if (chats && chats.length > 0) {
      console.log("First chat:", chats[0]);
    }
    console.log("Display chats:", displayChats?.length || 0);
  }, [chats, isLoading]);

  // Debounced search function
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim()) {
        try {
          setSearching(true);
          console.log("Searching for:", searchQuery);
          const response = await chatAPI.searchUsers(searchQuery);
          console.log("Search response:", response);
          const data =
            response.users || response.data?.users || response.data || response;
          console.log("Search results:", data);
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
    }, 300); // 300ms debounce

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  // Use search results if searching, otherwise show all chats
  const displayChats = searchQuery.trim() ? searchResults : chats;

  const renderChatItem = ({ item }) => {
    const chatName = getChatName(item, user?._id);
    const chatAvatar = getChatAvatar(item, user?._id);
    const online = isUserOnline(item, user?._id);
    const lastMessage = item.lastMessage;
    const unreadCount = item.unreadCount || 0;

    return (
      <TouchableOpacity
        style={[styles.chatItem, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate("ChatRoom", { chat: item })}
      >
        <Avatar uri={chatAvatar} name={chatName} size={55} online={online} />

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text
              style={[styles.chatName, { color: colors.text }]}
              numberOfLines={1}
            >
              {chatName}
            </Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatChatTime(lastMessage?.createdAt || item.updatedAt)}
            </Text>
          </View>

          <View style={styles.chatFooter}>
            <Text
              style={[
                styles.lastMessage,
                { color: colors.textSecondary },
                unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {getMessagePreview(lastMessage)}
            </Text>
            {unreadCount > 0 && (
              <View
                style={[
                  styles.unreadBadge,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && chats.length === 0) {
    return <Loader />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate("Contacts")}
        >
          <Ionicons name="create-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={[styles.searchContainer, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search chats..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Chat List */}
      <FlatList
        data={Array.isArray(displayChats) ? displayChats : []}
        keyExtractor={(item) => item._id}
        renderItem={renderChatItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          isLoading || searching ? (
            <Loader />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubbles-outline"
                size={80}
                color={colors.border}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery.trim() ? "No chats found" : "No chats yet"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => navigation.navigate("Contacts")}
              >
                <Text style={styles.startButtonText}>Start a conversation</Text>
              </TouchableOpacity>
            </View>
          )
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  chatItem: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  chatContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  time: {
    fontSize: 12,
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: "600",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 30,
  },
  startButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
