import { useEffect, useMemo, useRef, useState } from "react";

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function CallScreen({
  call,
  localStream,
  remoteStream,
  localName,
  localAvatarUrl,
  peerName,
  peerAvatarUrl,
  micMuted,
  camOff,
  remoteCamOff,
  error,
  onEnd,
  onToggleMute,
  onToggleCamera,
}) {
  const [now, setNow] = useState(() => Date.now());
  const [remoteVideoMuted, setRemoteVideoMuted] = useState(false);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const localInitial = useMemo(() => {
    const s = String(localName || "You").trim();
    return s ? s[0].toUpperCase() : "Y";
  }, [localName]);

  const peerInitial = useMemo(() => {
    const s = String(peerName || "Opponent").trim();
    return s ? s[0].toUpperCase() : "O";
  }, [peerName]);

  useEffect(() => {
    if (call?.state !== "active") return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [call?.state]);

  useEffect(() => {
    if (localRef.current && localStream) {
      // eslint-disable-next-line no-param-reassign
      localRef.current.srcObject = localStream;

      // Some browsers require an explicit play() after srcObject assignment.
      const el = localRef.current;
      const tryPlay = () => {
        try {
          const p = el.play?.();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } catch {
          // ignore
        }
      };
      el.onloadedmetadata = tryPlay;
      tryPlay();
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      // eslint-disable-next-line no-param-reassign
      remoteRef.current.srcObject = remoteStream;

      const el = remoteRef.current;
      const tryPlay = () => {
        try {
          const p = el.play?.();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } catch {
          // ignore
        }
      };
      el.onloadedmetadata = tryPlay;
      tryPlay();
    }
  }, [remoteStream]);

  useEffect(() => {
    const track = (remoteStream?.getVideoTracks?.() || [])[0] || null;
    if (!track) {
      setRemoteVideoMuted(false);
      return undefined;
    }

    const update = () =>
      setRemoteVideoMuted(!!track.muted || track.readyState !== "live");
    update();

    track.onmute = update;
    track.onunmute = update;
    track.onended = update;
    return () => {
      try {
        if (track.onmute === update) track.onmute = null;
        if (track.onunmute === update) track.onunmute = null;
        if (track.onended === update) track.onended = null;
      } catch {
        // ignore
      }
    };
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      // eslint-disable-next-line no-param-reassign
      remoteAudioRef.current.srcObject = remoteStream;
      try {
        const p = remoteAudioRef.current.play?.();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        // ignore
      }
    }
  }, [remoteStream]);

  const stateText = (() => {
    const s = call?.state;
    if (s === "outgoing") return "Ringing…";
    if (s === "connecting") return "Connecting…";
    if (s === "active") return "Connected";
    if (s === "ended") return "Ended";
    return "";
  })();

  const durationSec = (() => {
    if (call?.state !== "active") return 0;
    if (!call?.connectedAt) return 0;
    return Math.max(0, Math.floor((now - call.connectedAt) / 1000));
  })();

  const hasRemoteVideo = (() => {
    try {
      return (remoteStream?.getVideoTracks?.() || []).length > 0;
    } catch {
      return false;
    }
  })();

  const showRemoteVideo = hasRemoteVideo && !remoteVideoMuted && !remoteCamOff;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "rgba(0,0,0,0.85)", color: "#fff" }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {call?.type === "video" ? "Video call" : "Voice call"}
            </div>
            <div className="truncate text-xs" style={{ opacity: 0.85 }}>
              {call?.state === "active"
                ? formatDuration(durationSec)
                : stateText}
            </div>
          </div>

          <button
            type="button"
            className="h-9 rounded-full border px-4 text-sm font-semibold"
            style={{
              borderColor: "rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
            }}
            onClick={onEnd}
          >
            End
          </button>
        </div>

        <div className="relative flex-1">
          {call?.type === "video" ? (
            <div className="grid h-full grid-rows-2 gap-2 p-2 md:grid-cols-2 md:grid-rows-1">
              {/* Keep remote audio separate so we can mute the remote <video> for autoplay reliability */}
              <audio ref={remoteAudioRef} autoPlay playsInline />

              <div
                className="relative overflow-hidden rounded-xl border"
                style={{ borderColor: "rgba(255,255,255,0.2)" }}
              >
                <div
                  className="absolute left-2 top-2 z-10 rounded-lg px-2 py-1 text-[11px]"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  {showRemoteVideo
                    ? "Opponent"
                    : hasRemoteVideo
                    ? "Opponent (camera off)"
                    : "Opponent (waiting…)"}
                </div>
                {showRemoteVideo ? (
                  <video
                    ref={remoteRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      {peerAvatarUrl ? (
                        <img
                          src={peerAvatarUrl}
                          alt={peerName || "Opponent"}
                          className="h-20 w-20 rounded-full border object-cover"
                          style={{ borderColor: "rgba(255,255,255,0.25)" }}
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="flex h-20 w-20 items-center justify-center rounded-full border text-2xl font-semibold"
                          style={{ borderColor: "rgba(255,255,255,0.25)" }}
                          aria-hidden="true"
                        >
                          {peerInitial}
                        </div>
                      )}
                      <div
                        className="rounded-xl px-3 py-2 text-sm"
                        style={{ background: "rgba(0,0,0,0.35)" }}
                      >
                        {hasRemoteVideo || remoteCamOff
                          ? "Camera off"
                          : "Waiting for video…"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className="relative overflow-hidden rounded-xl border"
                style={{ borderColor: "rgba(255,255,255,0.2)" }}
              >
                <div
                  className="absolute left-2 top-2 z-10 rounded-lg px-2 py-1 text-[11px]"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  You
                </div>
                <video
                  ref={localRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                {camOff ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.25)" }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {localAvatarUrl ? (
                        <img
                          src={localAvatarUrl}
                          alt={localName || "You"}
                          className="h-20 w-20 rounded-full border object-cover"
                          style={{ borderColor: "rgba(255,255,255,0.25)" }}
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="flex h-20 w-20 items-center justify-center rounded-full border text-2xl font-semibold"
                          style={{ borderColor: "rgba(255,255,255,0.25)" }}
                          aria-hidden="true"
                        >
                          {localInitial}
                        </div>
                      )}
                      <div
                        className="rounded-xl px-3 py-2 text-sm"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                      >
                        Camera off
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(0,0,0,0.35)" }}
              >
                <div className="text-sm font-semibold">Voice call</div>
                <div className="mt-0.5 text-xs" style={{ opacity: 0.85 }}>
                  {stateText || " "}
                </div>
              </div>
              <audio ref={remoteRef} autoPlay />
              <audio ref={localRef} autoPlay muted />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 px-4 py-3">
          <button
            type="button"
            className="h-10 rounded-full px-4 text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
            onClick={onToggleMute}
          >
            {micMuted ? "Unmute" : "Mute"}
          </button>
          {call?.type === "video" ? (
            <button
              type="button"
              className="h-10 rounded-full px-4 text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
              onClick={onToggleCamera}
            >
              {camOff ? "Camera on" : "Camera off"}
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            className="px-4 pb-4 text-center text-xs"
            style={{ opacity: 0.9 }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
