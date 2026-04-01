import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { RTCView } from "react-native-webrtc";

export default function ActiveCallScreen({
  localStream,
  remoteStream,
  onEndCall,
  isVideo = true,
  remoteName,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    // Optionally handle stream events
  }, [localStream, remoteStream]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {remoteName ? `In Call with ${remoteName}` : "In Call"}
      </Text>
      <View style={styles.videoContainer}>
        {isVideo ? (
          remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
            />
          ) : (
            <View style={styles.remoteVideoPlaceholder} />
          )
        ) : (
          <>
            {/* Invisible RTCView for audio-only to ensure native playback on some devices */}
            {remoteStream ? (
              <RTCView
                streamURL={remoteStream.toURL()}
                style={styles.hiddenAudioView}
                objectFit="cover"
              />
            ) : (
              <View style={styles.remoteAudioPlaceholder}>
                <Text style={{ color: "#fff" }}>
                  Audio call - remote audio playing
                </Text>
              </View>
            )}
          </>
        )}

        {/* local preview for video only; for audio calls show mic status */}
        {isVideo ? (
          localStream ? (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
            />
          ) : null
        ) : (
          <View style={styles.localAudioBadge}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>You</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.endCall} onPress={onEndCall}>
        <Text style={styles.buttonText}>End Call</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    marginBottom: 10,
  },
  videoContainer: {
    width: "100%",
    height: 400,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 30,
  },
  remoteVideo: {
    width: "100%",
    height: 400,
    backgroundColor: "#000",
  },
  remoteVideoPlaceholder: {
    width: "100%",
    height: 400,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },
  remoteAudioPlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  hiddenAudioView: {
    width: 1,
    height: 1,
    opacity: 0,
  },
  localVideo: {
    width: 120,
    height: 160,
    position: "absolute",
    right: 20,
    bottom: 20,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 10,
    backgroundColor: "#222",
  },
  localAudioBadge: {
    width: 80,
    height: 40,
    position: "absolute",
    right: 20,
    bottom: 20,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 8,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  endCall: {
    backgroundColor: "#F44336",
    padding: 20,
    borderRadius: 50,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
});
