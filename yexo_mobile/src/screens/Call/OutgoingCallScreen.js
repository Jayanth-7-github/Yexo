import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components/Avatar";

export default function OutgoingCallScreen({
  calleeName,
  calleeAvatar,
  onCancel,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.status}>Calling...</Text>
      <Avatar name={calleeName} uri={calleeAvatar} size={100} />
      <Text style={styles.callee}>{calleeName || "Unknown User"}</Text>
      <TouchableOpacity style={styles.cancel} onPress={onCancel}>
        <Ionicons name="close" size={32} color="#fff" />
      </TouchableOpacity>
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
  callee: {
    fontSize: 26,
    color: "#fff",
    marginVertical: 24,
    fontWeight: "bold",
  },
  cancel: {
    backgroundColor: "#F44336",
    padding: 24,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
