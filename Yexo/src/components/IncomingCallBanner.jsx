// Minimal in-chat incoming call banner

export default function IncomingCallBanner({
  callerName,
  type,
  onAccept,
  onDecline,
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: "var(--border-color)",
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
      }}
    >
      <div className="text-sm font-semibold">
        📞 Incoming {type === "video" ? "Video" : "Voice"} Call
      </div>
      <div
        className="mt-0.5 text-xs"
        style={{ color: "var(--text-secondary)" }}
      >
        {callerName || "Someone"} is calling…
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          className="h-9 rounded-full border px-3 text-sm font-semibold"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          }}
          onClick={onDecline}
        >
          Decline
        </button>
        <button
          type="button"
          className="h-9 rounded-full px-3 text-sm font-semibold"
          style={{
            background: "var(--accent-green)",
            color: "#fff",
          }}
          onClick={onAccept}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
