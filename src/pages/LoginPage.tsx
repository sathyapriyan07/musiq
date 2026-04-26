import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { AdminButton } from "../components/admin/AdminComponents";
import { ErrorState } from "../components/States";

type Mode = "login" | "signup" | "magic";

export function LoginPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const mode: Mode = useMemo(() => {
    const raw = params.get("mode");
    if (raw === "signup" || raw === "magic" || raw === "login") return raw;
    return "login";
  }, [params]);

  const next = params.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    if (mode === "magic") {
      setIsSubmitting(true);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
      });
      setIsSubmitting(false);

      if (otpError) {
        setError(otpError.message);
        return;
      }

      setNotice("Magic link sent. Check your email to continue.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setIsSubmitting(true);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: displayName ? { full_name: displayName } : undefined,
        },
      });
      setIsSubmitting(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setNotice("Account created. Check your email to confirm, then log in.");
        return;
      }

      navigate(next);
      return;
    }

    // login
    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    navigate(next);
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border bg-panel p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-text">
              {mode === "signup"
                ? "Sign up"
                : mode === "magic"
                  ? "Magic link"
                  : "Login"}
            </div>
            <div className="mt-2 text-sm text-muted">
              {mode === "magic"
                ? "We’ll email you a one-time sign-in link."
                : "Supabase Auth (email/password, magic link, OAuth)."}
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-full border bg-panel px-4 text-sm font-semibold text-text hover:bg-panel2"
          >
            Home
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParams({ mode: "login", next })}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
              mode === "login"
                ? "bg-panel2 text-text"
                : "bg-panel text-muted hover:bg-panel2 hover:text-text"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setParams({ mode: "signup", next })}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
              mode === "signup"
                ? "bg-panel2 text-text"
                : "bg-panel text-muted hover:bg-panel2 hover:text-text"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => setParams({ mode: "magic", next })}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
              mode === "magic"
                ? "bg-panel2 text-text"
                : "bg-panel text-muted hover:bg-panel2 hover:text-text"
            }`}
          >
            Magic link
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Email
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              placeholder="you@example.com"
              inputMode="email"
              autoComplete="email"
            />
          </div>

          {mode === "signup" ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Display name (optional)
              </div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                placeholder="Sathy"
                autoComplete="nickname"
              />
            </div>
          ) : null}

          {mode !== "magic" ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Password
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
          ) : null}

          {mode === "signup" ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Confirm password
              </div>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                type="password"
                autoComplete="new-password"
              />
            </div>
          ) : null}
        </div>

        {error ? <ErrorState className="mt-5" title="Error" description={error} /> : null}
        {notice ? (
          <div className="mt-5 rounded-xl border bg-panel2 p-4 text-sm text-muted">
            {notice}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <AdminButton
            variant="primary"
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "magic"
                  ? "Send magic link"
                  : "Login"}
          </AdminButton>
          <div className="text-center text-xs text-muted">
            {next !== "/" ? (
              <>
                After login, you’ll be redirected to{" "}
                <span className="text-text">{next}</span>.
              </>
            ) : (
              "You can set your admin role in the profiles table."
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
