import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const CallBar = ({ callerName, onJoin, onDismiss }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="call" size={24} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{callerName} is calling...</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.joinBtn} onPress={onJoin}>
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={styles.btnText}>Join</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e2e2e",
    padding: 10,
    borderRadius: 12,
    margin: 8,
    elevation: 3,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    flex: 1,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  joinBtn: {
    backgroundColor: "#4caf50",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  dismissBtn: {
    backgroundColor: "#e53935",
    borderRadius: 8,
    padding: 6,
  },
  btnText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "bold",
  },
});
