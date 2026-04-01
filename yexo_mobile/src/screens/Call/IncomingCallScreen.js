import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components/Avatar";

export default function IncomingCallScreen({
  callerName,
  callerAvatar,
  onAccept,
  onReject,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.status}>Yexo Voice Call</Text>
      <Avatar name={callerName} uri={callerAvatar} size={100} />
      <Text style={styles.caller}>{callerName || "Unknown Caller"}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.accept} onPress={onAccept}>
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.reject} onPress={onReject}>
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
  },
  status: {
    fontSize: 18,
    color: "#bdbdbd",
    marginBottom: 10,
    marginTop: 30,
  },
  caller: {
    fontSize: 26,
    color: "#fff",
    marginVertical: 24,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    gap: 40,
  },
  accept: {
    backgroundColor: "#25D366",
    padding: 24,
    borderRadius: 50,
    marginRight: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  reject: {
    backgroundColor: "#F44336",
    padding: 24,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
