import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { mediaDevices } from "react-native-webrtc";
import { useSocketStore } from "../store/socket.store";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from "react-native-webrtc";

// NOTE: Please replace the TURN entry below with your TURN server credentials.
// Without a TURN server, many mobile devices behind NAT won't be able to
// establish a direct media path and ICE may fail.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // Example TURN (replace with your host/creds):
  // { urls: "turn:turn.example.com:3478", username: "user", credential: "pass" }
];

export function useWebRTCCall({ userId, onCallEvent }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState("idle"); // idle | initiated | incoming | connecting | in-call | ended
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const peerConnection = useRef(null);
  const socket = useRef(null);
  const pendingRemoteCandidates = useRef([]);
  const incomingCallFrom = useRef(null);
  const currentPeerId = useRef(null);
  const restartAttempts = useRef(0);
  const MAX_RESTARTS = 1;
  const incomingCallType = useRef("audio");
  const storedOffer = useRef(null);

  // subscribe to global socket from the socket store so we react to its changes
  const globalSocket = useSocketStore((s) => s.socket);

  // Initialize socket and listeners
  useEffect(() => {
    if (!globalSocket) {
      console.log("[WebRTC] No global socket available yet");
      socket.current = null;
      setIsSocketConnected(false);
      return;
    }

    socket.current = globalSocket;
    console.log(
      "[WebRTC] Using global socket from store, id:",
      socket.current.id
    );
    setIsSocketConnected(!!socket.current.connected);

    const onConnect = () => {
      console.log(
        "[WebRTC] Global socket connected (store)",
        socket.current.id
      );
      setIsSocketConnected(true);
    };
    const onDisconnect = () => {
      console.log("[WebRTC] Global socket disconnected (store)");
      setIsSocketConnected(false);
    };

    socket.current.on("connect", onConnect);
    socket.current.on("disconnect", onDisconnect);

    // Signaling listeners
    socket.current.on("call_initiate", (data) => {
      incomingCallFrom.current = data.fromUserId || data.from;
      incomingCallType.current = data.callType || "audio";
      setCallState("incoming");
      if (onCallEvent) onCallEvent("incoming", incomingCallFrom.current);
    });

    socket.current.on("call_offer", (data) => {
      if (onCallEvent) onCallEvent("offer", data.fromUserId || data.from);
      handleReceiveOffer(data);
    });

    socket.current.on("call_answer", (data) => {
      if (onCallEvent) onCallEvent("answer", data.fromUserId || data.from);
      handleReceiveAnswer(data);
    });

    socket.current.on("call_ice_candidate", (data) => {
      if (onCallEvent) onCallEvent("ice", data.fromUserId || data.from);
      handleNewICECandidateMsg(data);
    });

    socket.current.on("call_timeout", (data) => {
      setCallState("ended");
      if (onCallEvent)
        onCallEvent("timeout", data?.fromUserId || data?.targetUserId);
      handleCallEnded();
    });

    socket.current.on("call_unavailable", (data) => {
      setCallState("ended");
      if (onCallEvent)
        onCallEvent("unavailable", data?.targetUserId || data?.fromUserId);
    });

    socket.current.on("call_end", (data) => {
      if (onCallEvent)
        onCallEvent("end", data?.fromUserId || data?.targetUserId);
      handleCallEnded();
    });

    return () => {
      try {
        if (socket.current) {
          socket.current.off("connect", onConnect);
          socket.current.off("disconnect", onDisconnect);
          socket.current.off("call_initiate");
          socket.current.off("call_offer");
          socket.current.off("call_answer");
          socket.current.off("call_ice_candidate");
          socket.current.off("call_timeout");
          socket.current.off("call_unavailable");
          socket.current.off("call_end");
        }
      } catch (e) {
        console.warn("[WebRTC] cleanup error", e);
      }
    };
  }, [globalSocket]);

  // Get local media
  const getLocalStream = useCallback(async ({ video = false } = {}) => {
    console.log("[WebRTC] requesting media... video:", !!video);

    // 1) Android: request microphone permission at runtime
    if (Platform.OS === "android") {
      try {
        const mic = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message:
              "Yexo needs access to your microphone to make voice calls.",
            buttonPositive: "OK",
          }
        );
        console.log("[WebRTC] RECORD_AUDIO permission:", mic);
        if (mic !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn("[WebRTC] RECORD_AUDIO permission DENIED");
          throw new Error("Microphone permission denied");
        }
      } catch (e) {
        console.warn("[WebRTC] permission request failed", e);
        throw e;
      }
    }

    // 2) Request audio (and video when requested)
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: !!video,
    };

    console.log("[WebRTC] calling getUserMedia with:", constraints);

    const stream = await mediaDevices.getUserMedia(constraints);

    // 3) Verify audio track exists
    try {
      const audioTracks = stream.getAudioTracks();
      console.log(
        "[WebRTC] audioTracks:",
        audioTracks.map((t) => ({ id: t.id, enabled: t.enabled, kind: t.kind }))
      );
      if (!audioTracks || audioTracks.length === 0) {
        console.error("[WebRTC] NO AUDIO TRACK CREATED — MIC NOT WORKING");
      }
    } catch (e) {
      console.warn("[WebRTC] could not enumerate audio tracks", e);
    }

    setLocalStream(stream);
    return stream;
  }, []);

  // Start a call: send call_initiate, then wait for accept then create offer
  const startCall = useCallback(
    async (calleeId, isVideo = false) => {
      console.log(
        "[WebRTC] startCall triggered for calleeId:",
        calleeId,
        "isVideo:",
        isVideo
      );
      if (!socket.current || !socket.current.connected) {
        console.error("[WebRTC] Socket not connected - cannot start call");
        return;
      }

      setCallState("initiated");
      socket.current.emit(
        "call_initiate",
        { targetUserId: calleeId, callType: isVideo ? "video" : "audio" },
        (ack) => console.log("[WebRTC] call_initiate ack:", ack)
      );

      const onCallAccept = (data) => {
        try {
          if (!data || data.fromUserId !== calleeId) return;
          console.log("[WebRTC] call accepted by:", calleeId, data);
          proceedCreateOffer(calleeId, isVideo);
        } finally {
          socket.current.off("call_accept", onCallAccept);
        }
      };
      socket.current.on("call_accept", onCallAccept);

      const onCallReject = (data) => {
        if (!data || data.fromUserId !== calleeId) return;
        console.log("[WebRTC] call rejected by:", calleeId, data);
        setCallState("ended");
        socket.current.off("call_reject", onCallReject);
        socket.current.off("call_timeout", onCallTimeout);
      };
      const onCallTimeout = (data) => {
        if (!data || data.fromUserId !== calleeId) return;
        console.log("[WebRTC] call timed out for:", calleeId, data);
        setCallState("ended");
        socket.current.off("call_reject", onCallReject);
        socket.current.off("call_timeout", onCallTimeout);
      };
      socket.current.on("call_reject", onCallReject);
      socket.current.on("call_timeout", onCallTimeout);
      currentPeerId.current = calleeId;
    },
    [getLocalStream, userId]
  );

  // Helper to create offer once callee accepted
  const proceedCreateOffer = useCallback(
    async (calleeId, isVideo = false) => {
      setCallState("calling");
      const stream = await getLocalStream({ video: !!isVideo });
      peerConnection.current = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });
      // remember who we're connected to for restarts
      currentPeerId.current = calleeId;

      // add tracks
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // send local ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] Sending ICE candidate:", event.candidate);
          socket.current.emit(
            "call_ice_candidate",
            { targetUserId: calleeId, candidate: event.candidate },
            (ack) => console.log("[WebRTC] call_ice_candidate ack:", ack)
          );
        }
      };

      // ICE gathering / candidate errors
      peerConnection.current.onicegatheringstatechange = () => {
        try {
          console.log(
            "[WebRTC] iceGatheringState (caller):",
            peerConnection.current.iceGatheringState
          );
        } catch (e) {}
      };
      peerConnection.current.onicecandidateerror = (err) => {
        console.warn("[WebRTC] onicecandidateerror (caller):", err);
      };

      // Connection state logging for diagnostics (caller)
      peerConnection.current.oniceconnectionstatechange = () => {
        try {
          console.log(
            "[WebRTC] ICE state (caller):",
            peerConnection.current.iceConnectionState
          );
        } catch (e) {
          console.warn("[WebRTC] could not read iceConnectionState", e);
        }
      };
      peerConnection.current.onconnectionstatechange = () => {
        try {
          const cs = peerConnection.current.connectionState;
          console.log("[WebRTC] connection state (caller):", cs);
          // reset restart attempts when connected
          if (cs === "connected" || cs === "completed" || cs === "stable") {
            restartAttempts.current = 0;
          }
          if (cs === "failed") {
            // attempt ICE restart once
            if (restartAttempts.current < MAX_RESTARTS) {
              restartAttempts.current += 1;
              (async () => {
                try {
                  console.log("[WebRTC] attempting ICE restart (caller)");
                  const offer = await peerConnection.current.createOffer({
                    iceRestart: true,
                  });
                  await peerConnection.current.setLocalDescription(
                    new RTCSessionDescription(offer)
                  );
                  socket.current.emit(
                    "call_offer",
                    {
                      targetUserId: currentPeerId.current,
                      offer,
                      iceRestart: true,
                    },
                    (ack) =>
                      console.log("[WebRTC] call_offer(iceRestart) ack:", ack)
                  );
                } catch (e) {
                  console.warn("[WebRTC] ICE restart (caller) failed:", e);
                }
              })();
            } else {
              console.warn(
                "[WebRTC] max ICE restart attempts reached (caller)"
              );
            }
          }
        } catch (e) {
          console.warn("[WebRTC] could not read connectionState", e);
        }
      };

      // modern ontrack
      peerConnection.current.ontrack = (event) => {
        console.log("[WebRTC] ontrack -> setting remote stream", event);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else if (event.track) {
          // Some Android devices emit track without streams — create MediaStream wrapper
          try {
            const inbound = new MediaStream();
            inbound.addTrack(event.track);
            setRemoteStream(inbound);
          } catch (e) {
            console.warn("[WebRTC] ontrack fallback failed", e);
          }
        } else {
          setRemoteStream(null);
        }
      };

      let offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: !!isVideo,
      });

      // Defensive SDP tweaks for Android compatibility
      try {
        if (offer && offer.sdp && typeof offer.sdp === "string") {
          let sdp = offer.sdp;
          // prefer stereo for inband FEC where present
          sdp = sdp.replace(/useinbandfec=1/g, "useinbandfec=1; stereo=1");
          // profile-level-id tweak for some Android encoders
          sdp = sdp.replace(
            /profile-level-id=42001f/g,
            "profile-level-id=42e01f"
          );
          offer = { ...offer, sdp };
        }
      } catch (e) {
        console.warn("[WebRTC] SDP tweak failed for offer:", e);
      }

      await peerConnection.current.setLocalDescription(
        new RTCSessionDescription(offer)
      );

      const offerPayload = {
        targetUserId: calleeId,
        offer,
      };
      console.log("[WebRTC] [EMIT] call_offer", offerPayload);
      socket.current.emit("call_offer", offerPayload, (ack) => {
        console.log("[WebRTC] call_offer ack:", ack);
      });

      // drain any buffered remote candidates if they arrived early
      if (pendingRemoteCandidates.current.length > 0) {
        pendingRemoteCandidates.current.forEach(async (c) => {
          try {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(c)
            );
            console.log("[WebRTC] added buffered remote candidate (caller)", c);
          } catch (e) {
            console.warn("[WebRTC] error adding buffered candidate", e);
          }
        });
        pendingRemoteCandidates.current = [];
      }
    },
    [getLocalStream]
  );

  // Receive offer
  const handleReceiveOffer = useCallback(
    async ({ fromUserId, offer }) => {
      console.log("[WebRTC] handleReceiveOffer from:", fromUserId);
      // If peerConnection exists (user accepted already), process immediately
      if (!peerConnection.current) {
        // store offer until user accepts
        storedOffer.current = { fromUserId, offer };
        console.log("[WebRTC] Offer stored until user accepts");
        return;
      }

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
      } catch (e) {
        console.warn("[WebRTC] error setting remote description on offer:", e);
      }

      // create and send answer
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(
        new RTCSessionDescription(answer)
      );
      socket.current.emit(
        "call_answer",
        { targetUserId: fromUserId, answer },
        (ack) => console.log("[WebRTC] call_answer ack:", ack)
      );
    },
    [getLocalStream, userId, onCallEvent]
  );

  // Receive answer
  const handleReceiveAnswer = useCallback(
    async ({ answer, fromUserId } = {}) => {
      try {
        console.log(
          "[WebRTC] handleReceiveAnswer received",
          answer && typeof answer === "object"
            ? answer.type || "answer"
            : typeof answer
        );
        console.log(
          "[WebRTC] peerConnection.current exists:",
          !!peerConnection.current
        );
        if (peerConnection.current) {
          try {
            console.log(
              "[WebRTC] before setRemoteDescription - ice:",
              peerConnection.current.iceConnectionState,
              "conn:",
              peerConnection.current.connectionState
            );
          } catch (e) {}
        }
        // Defensive SDP fixes for Android devices
        if (answer && answer.sdp && typeof answer.sdp === "string") {
          let sdp = answer.sdp;
          try {
            sdp = sdp.replace(/useinbandfec=1/g, "useinbandfec=1; stereo=1");
          } catch (e) {}
          try {
            sdp = sdp.replace(
              /profile-level-id=42001f/g,
              "profile-level-id=42e01f"
            );
          } catch (e) {}
          answer = { ...answer, sdp };
        }

        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        console.log("[WebRTC] setRemoteDescription(answer) success");
        try {
          console.log(
            "[WebRTC] after setRemoteDescription - ice:",
            peerConnection.current.iceConnectionState,
            "conn:",
            peerConnection.current.connectionState
          );
        } catch (e) {}
        setCallState("in-call");
        try {
          if (onCallEvent) onCallEvent("connected", fromUserId);
        } catch (e) {
          console.warn("[WebRTC] onCallEvent connected failed", e);
        }
      } catch (e) {
        console.warn("[WebRTC] error setting remote description (answer):", e);
      }
    },
    []
  );

  // ICE candidate
  const handleNewICECandidateMsg = useCallback(async ({ candidate }) => {
    try {
      if (!peerConnection.current) {
        // buffer candidate until PC is ready
        pendingRemoteCandidates.current.push(candidate);
        console.log(
          "[WebRTC] Buffered remote ICE candidate (peer not ready)",
          candidate
        );
        return;
      }
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
      console.log("[WebRTC] added remote ICE candidate", candidate);
    } catch (e) {
      console.warn("[WebRTC] error adding ICE candidate:", e);
    }
  }, []);

  // End call
  const endCall = useCallback((otherUserId) => {
    setCallState("ended");
    if (peerConnection.current) {
      try {
        peerConnection.current.close();
      } catch (e) {}
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (socket.current && socket.current.connected) {
      socket.current.emit("call_end", { targetUserId: otherUserId });
    }
    // clear buffered candidates and incoming caller
    pendingRemoteCandidates.current = [];
    incomingCallFrom.current = null;
    storedOffer.current = null;
  }, []);

  // Handle call ended
  const handleCallEnded = useCallback(() => {
    setCallState("ended");
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  return {
    localStream,
    remoteStream,
    callState,
    startCall,
    endCall,
    socket: socket.current,
    isSocketConnected,
    // Controls for incoming calls
    acceptCall: async () => {
      const callerId = incomingCallFrom.current;
      if (!callerId)
        return console.warn("[WebRTC] No incoming caller to accept");
      socket.current.emit("call_accept", { targetUserId: callerId }, (ack) =>
        console.log("[WebRTC] call_accept ack:", ack)
      );
      setCallState("connecting");
      const stream = await getLocalStream({
        video: incomingCallType.current === "video",
      });
      peerConnection.current = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });
      stream
        .getTracks()
        .forEach((track) => peerConnection.current.addTrack(track, stream));
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current.emit(
            "call_ice_candidate",
            { targetUserId: callerId, candidate: event.candidate },
            (ack) =>
              console.log("[WebRTC] call_ice_candidate (answerer) ack:", ack)
          );
        }
      };
      // remember current peer
      currentPeerId.current = callerId;
      peerConnection.current.onconnectionstatechange = () => {
        try {
          const cs = peerConnection.current.connectionState;
          console.log("[WebRTC] connection state (answerer):", cs);
          if (cs === "connected" || cs === "completed" || cs === "stable") {
            restartAttempts.current = 0;
          }
          if (cs === "failed") {
            if (restartAttempts.current < MAX_RESTARTS) {
              restartAttempts.current += 1;
              (async () => {
                try {
                  console.log("[WebRTC] attempting ICE restart (answerer)");
                  const offer = await peerConnection.current.createOffer({
                    iceRestart: true,
                  });
                  await peerConnection.current.setLocalDescription(
                    new RTCSessionDescription(offer)
                  );
                  socket.current.emit(
                    "call_offer",
                    {
                      targetUserId: currentPeerId.current,
                      offer,
                      iceRestart: true,
                    },
                    (ack) =>
                      console.log("[WebRTC] call_offer(iceRestart) ack:", ack)
                  );
                } catch (e) {
                  console.warn("[WebRTC] ICE restart (answerer) failed:", e);
                }
              })();
            } else {
              console.warn(
                "[WebRTC] max ICE restart attempts reached (answerer)"
              );
            }
          }
        } catch (e) {
          console.warn("[WebRTC] could not read connectionState (answerer)", e);
        }
      };
      peerConnection.current.onicegatheringstatechange = () => {
        try {
          console.log(
            "[WebRTC] iceGatheringState (answerer):",
            peerConnection.current.iceGatheringState
          );
        } catch (e) {}
      };
      peerConnection.current.onicecandidateerror = (err) => {
        console.warn("[WebRTC] onicecandidateerror (answerer):", err);
      };
      // Connection state logging for diagnostics (answerer)
      peerConnection.current.oniceconnectionstatechange = () => {
        try {
          console.log(
            "[WebRTC] ICE state (answerer):",
            peerConnection.current.iceConnectionState
          );
        } catch (e) {
          console.warn(
            "[WebRTC] could not read iceConnectionState (answerer)",
            e
          );
        }
      };
      peerConnection.current.onconnectionstatechange = () => {
        try {
          console.log(
            "[WebRTC] connection state (answerer):",
            peerConnection.current.connectionState
          );
        } catch (e) {
          console.warn("[WebRTC] could not read connectionState (answerer)", e);
        }
      };
      peerConnection.current.ontrack = (event) => {
        console.log("[WebRTC] ontrack (answerer) ->", event);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else if (event.track) {
          try {
            const inbound = new MediaStream();
            inbound.addTrack(event.track);
            setRemoteStream(inbound);
          } catch (e) {
            console.warn("[WebRTC] ontrack fallback failed (answerer)", e);
            setRemoteStream(null);
          }
        } else {
          setRemoteStream(null);
        }
      };

      // if an offer arrived earlier and was stored, process it now
      if (storedOffer.current && storedOffer.current.offer) {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(storedOffer.current.offer)
          );
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(
            new RTCSessionDescription(answer)
          );
          socket.current.emit(
            "call_answer",
            { targetUserId: storedOffer.current.fromUserId, answer },
            (ack) => console.log("[WebRTC] call_answer ack:", ack)
          );
        } catch (e) {
          console.warn("[WebRTC] error handling stored offer on accept:", e);
        }
        storedOffer.current = null;
      }

      // drain buffered remote ICE candidates
      if (pendingRemoteCandidates.current.length > 0) {
        pendingRemoteCandidates.current.forEach(async (c) => {
          try {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(c)
            );
          } catch (e) {
            console.warn(
              "[WebRTC] error adding buffered candidate on accept",
              e
            );
          }
        });
        pendingRemoteCandidates.current = [];
      }
    },
    rejectCall: () => {
      const callerId = incomingCallFrom.current;
      if (!callerId)
        return console.warn("[WebRTC] No incoming caller to reject");
      socket.current.emit("call_reject", { targetUserId: callerId }, (ack) =>
        console.log("[WebRTC] call_reject ack:", ack)
      );
      setCallState("ended");
      incomingCallFrom.current = null;
      pendingRemoteCandidates.current = [];
      storedOffer.current = null;
    },
  };
}
