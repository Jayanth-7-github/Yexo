export default function ThemeToggle({ preference, onChange }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-2 py-1"
      style={{
        borderColor: "var(--border-color)",
        background: "var(--bg-elevated)",
      }}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        onClick={() => onChange("light")}
        className="rounded-full px-2 py-1 text-sm"
        style={{
          color:
            preference === "light"
              ? "var(--text-primary)"
              : "var(--text-secondary)",
          background:
            preference === "light" ? "var(--bg-secondary)" : "transparent",
        }}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => onChange("dark")}
        className="rounded-full px-2 py-1 text-sm"
        style={{
          color:
            preference === "dark"
              ? "var(--text-primary)"
              : "var(--text-secondary)",
          background:
            preference === "dark" ? "var(--bg-secondary)" : "transparent",
        }}
      >
        Dark
      </button>
      <button
        type="button"
        onClick={() => onChange("system")}
        className="rounded-full px-2 py-1 text-sm"
        style={{
          color:
            preference === "system"
              ? "var(--text-primary)"
              : "var(--text-secondary)",
          background:
            preference === "system" ? "var(--bg-secondary)" : "transparent",
        }}
      >
        System
      </button>
    </div>
  );
}
