import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";
import "./Login.css";

function getLoginErrorMessage(error) {
  const message = (error?.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return "The email or password is incorrect. Please check your details and try again.";
  }

  if (message.includes("email not confirmed")) {
    return "Your email address hasn't been confirmed yet. Check your inbox for a confirmation email.";
  }

  if (
    message.includes("too many requests") ||
    message.includes("rate limit")
  ) {
    return "There have been too many attempts. Please wait a few minutes before trying again.";
  }

  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    return "Unable to connect to the login service. Check your internet connection and try again.";
  }

  return "We couldn't sign you in. Please try again. If the problem continues, contact support.";
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearMessages();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (!resetMode && !password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);

    try {
      if (resetMode) {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${window.location.origin}/login`,
          });

        if (resetError) {
          setError(getLoginErrorMessage(resetError));
          return;
        }

        setSuccess(
          "If an account exists for that email, a password-reset link will be sent. Check your inbox and spam folder."
        );
        return;
      }

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (loginError) {
        setError(getLoginErrorMessage(loginError));
        return;
      }

      const requestedPath = location.state?.from;
      const destination =
        requestedPath?.pathname &&
        requestedPath.pathname !== "/login"
          ? `${requestedPath.pathname}${requestedPath.search || ""}${requestedPath.hash || ""}`
          : "/";

      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Login request failed:", err);
      setError(
        "Something went wrong while contacting the login service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleResetMode() {
    setResetMode((current) => !current);
    setPassword("");
    clearMessages();
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="38" height="38" rx="12" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15 15V33M15 15H33M24 15V33M15 24H33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <p className="login-eyebrow">PIANO SERVICE MANAGEMENT</p>
        <h1 className="login-title">
          {resetMode ? "Reset your password" : "Welcome back"}
        </h1>
        <p className="login-subtitle">
          {resetMode
            ? "Enter your email and we'll send instructions to reset your password."
            : "Sign in to access your clients, pianos, and appointments."}
        </p>

        {error && (
          <div className="login-message login-message-error" role="alert">
            <span className="login-message-icon" aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="login-message login-message-success" role="status">
            <span className="login-message-icon" aria-hidden="true">✓</span>
            <p>{success}</p>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearMessages();
              }}
              autoFocus
              required
              disabled={loading}
            />
          </div>

          {!resetMode && (
            <div className="login-field">
              <div className="login-label-row">
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className="login-text-button"
                  onClick={toggleResetMode}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              <div className="login-password-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearMessages();
                  }}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={loading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {resetMode && (
            <button
              type="button"
              className="login-back-button"
              onClick={toggleResetMode}
              disabled={loading}
            >
              Back to sign in
            </button>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="login-button-spinner" />
                {resetMode ? "Sending instructions..." : "Signing in..."}
              </>
            ) : resetMode ? (
              "Send reset link"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="login-footer">
          Secure access to your piano service workspace.
        </p>
      </section>
    </main>
  );
}

export default Login;
