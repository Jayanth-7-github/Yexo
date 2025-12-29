import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { getMyProfile } from "../api/users";
import { useAuthStore } from "../store/authStore";

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function ProfilePage({ theme }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyProfile();
      setProfile(res?.data || null);
    } catch (err) {
      setError(err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-full" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto flex h-full max-w-240 flex-col">
        <header
          className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--bg-secondary)",
          }}
        >
          <div className="min-w-0">
            <div
              className="truncate text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Profile
            </div>
            <div
              className="truncate text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              View your account details
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle
              preference={theme.preference}
              onChange={theme.setPreference}
            />
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="h-9 rounded-full border px-3 text-sm"
              style={{
                borderColor: "var(--border-color)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="h-9 rounded-full border px-3 text-sm"
              style={{
                borderColor: "var(--border-color)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <div
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--border-color)",
              background: "var(--bg-secondary)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Account details
              </div>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border-color)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {error ? (
              <div
                className="mt-3 text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {error}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              <div
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Username
                </div>
                <div
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {safeText(profile?.username) || "—"}
                </div>
              </div>

              <div
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Email
                </div>
                <div
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {safeText(profile?.email) || "—"}
                </div>
              </div>

              <div
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Phone
                </div>
                <div
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {safeText(profile?.phoneNumber) || "—"}
                </div>
              </div>

              <div
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Status
                </div>
                <div
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {safeText(profile?.statusMessage) || "—"}
                </div>
              </div>

              <div
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  User ID
                </div>
                <div
                  className="mt-1 break-all text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {safeText(profile?._id) || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
