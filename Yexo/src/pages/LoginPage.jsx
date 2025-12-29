import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../hooks/useTheme";

function Field({ label, ...props }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      <input
        {...props}
        className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
        style={{
          borderColor: "var(--border-color)",
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
        }}
      />
    </label>
  );
}

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError } = useAuthStore();

  const from = useMemo(
    () => location.state?.from?.pathname || "/",
    [location.state]
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    const ok = await login({ username, password });
    setLoading(false);
    if (ok) navigate(from, { replace: true });
  };

  return (
    <div className="min-h-full" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto flex min-h-full max-w-240 flex-col px-4 py-6">
        <header className="flex items-center justify-between">
          <div>
            <div
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Yexo
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Sign in to continue
            </div>
          </div>
          <ThemeToggle
            preference={theme.preference}
            onChange={theme.setPreference}
          />
        </header>

        <main className="mx-auto flex w-full max-w-105 flex-1 flex-col justify-center py-10">
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: "var(--border-color)",
              background: "var(--bg-secondary)",
            }}
          >
            <form onSubmit={onSubmit} className="space-y-3">
              <Field
                label="Username / Email / Phone"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                required
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />

              {error ? (
                <div
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                  }}
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="h-10 w-full rounded-xl text-sm font-semibold"
                style={{
                  background: "var(--accent-green)",
                  color: "#fff",
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <div
                className="pt-2 text-center text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                New here?{" "}
                <Link
                  to="/register"
                  className="font-semibold"
                  style={{ color: "var(--accent-green)" }}
                >
                  Create account
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
