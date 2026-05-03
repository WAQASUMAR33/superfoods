"use client";

import { useEffect, useState } from "react";
import { getCsrfToken, getSession, signIn } from "next-auth/react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { BRAND_DISPLAY_NAME } from "@/config/branding";

/**
 * Where to send the user after sign-in (`?callbackUrl=` from redirects is supported).
 */
function getPostLoginRedirectUrl(): string {
  if (typeof window === "undefined") return "/dashboard";
  const origin = window.location.origin;
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw) return `${origin}/dashboard`;
  try {
    const target = /^https?:\/\//i.test(raw)
      ? raw
      : new URL(raw.startsWith("/") ? raw : `/${raw}`, origin).href;
    const u = new URL(target);
    if (u.origin !== origin) return `${origin}/dashboard`;
    return u.href;
  } catch {
    return `${origin}/dashboard`;
  }
}

function resolveLocationHref(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const h = header.trim();
  if (h.startsWith("http://") || h.startsWith("https://")) return h;
  if (typeof window === "undefined") return fallback;
  return `${window.location.origin}${h.startsWith("/") ? "" : "/"}${h}`;
}

/** Failed credential sign-ins typically redirect back with ?error=. */
function looksLikeAuthFailureUrl(urlLike: string): boolean {
  try {
    const u = new URL(urlLike);
    if (!u.searchParams.has("error")) return false;
    return u.pathname.endsWith("/login") || u.pathname.includes("signin");
  } catch {
    return urlLike.includes("error=");
  }
}

/**
 * Prefer urlencoded POST **without** `json: true`: Next Auth then returns HTTP 302 + Set-Cookie
 * (the same behaviour as an HTML login form post). This matches browsers more reliably than
 * the JSON+fetched signIn helper on some hosts/proxies.
 */
async function postCredentialsViaRedirect(username: string, password: string, callbackUrl: string): Promise<boolean> {
  const csrfToken = await getCsrfToken();
  if (!csrfToken || typeof window === "undefined") return false;

  const res = await fetch(`${window.location.origin}/api/auth/callback/credentials`, {
    method: "POST",
    credentials: "same-origin",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl,
      username,
      password,
    }).toString(),
  });

  if (res.type === "opaqueredirect" || res.status === 0) {
    window.location.replace(callbackUrl);
    return true;
  }

  const redirectCodes = new Set([301, 302, 303, 307, 308]);
  if (redirectCodes.has(res.status)) {
    const target = resolveLocationHref(res.headers.get("Location"), callbackUrl);
    if (looksLikeAuthFailureUrl(target)) {
      return false;
    }
    window.location.replace(target);
    return true;
  }

  if (res.ok) {
    window.location.replace(callbackUrl);
    return true;
  }

  return false;
}

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("error");
      if (!code) return;
      if (code === "CredentialsSignin") setError("Invalid username or password");
      else if (code === "AccessDenied") setError("Account is inactive or access was denied.");
      else if (code === "SessionRequired") setError("Your session expired. Sign in again.");
      else if (code === "Configuration")
        setError("Server configuration error — set NEXTAUTH_SECRET and NEXTAUTH_URL on deployment.");
      else setError("Unable to sign in. Try again.");
      params.delete("error");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    } catch {
      /* ignore */
    }
  }, []);

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const callbackUrl = getPostLoginRedirectUrl();

    // 1) Native-style redirect POST (cookie + Location) — avoids json:true fetch limitations.
    try {
      const redirected = await postCredentialsViaRedirect(username, password, callbackUrl);
      if (redirected) return;
    } catch {
      /* fall through */
    }

    // 2) next-auth client helper — redirect:false avoids hanging await on redirect:true.
    let signInResult: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      signInResult = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl,
      });
    } catch {
      signInResult = undefined;
    }

    await new Promise((r) => setTimeout(r, 75));
    let sessionAfter;
    try {
      sessionAfter = await getSession();
    } catch {
      sessionAfter = undefined;
    }

    const signedIn =
      (signInResult != null &&
        signInResult.ok === true &&
        (signInResult.error == null || signInResult.error === "")) ||
      !!(sessionAfter?.user?.name ?? sessionAfter?.user?.email);

    if (signedIn) {
      window.location.replace(callbackUrl);
      return;
    }

    const err = signInResult?.error ?? "";
    setLoading(false);
    if (err === "CredentialsSignin" || signInResult?.status === 401 || signInResult?.ok === false) {
      setError("Invalid username or password");
      return;
    }
    setError("Sign-in could not complete. Verify NEXTAUTH_SECRET and DATABASE_URL on the server.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020d1f] px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-[#0099D6]/20 blur-[140px]" />
        <div className="absolute -bottom-64 -right-64 h-[600px] w-[600px] rounded-full bg-[#0099D6]/10 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#004F7C]/15 blur-[120px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,153,214,0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-2xl shadow-[#0099D6]/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/amb_logo.png" alt="AMB Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">AMB</h1>
          <p className="mt-1.5 text-sm font-medium tracking-wide text-[#0099D6]">Super Foods</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-slate-400">Sign in to your account to continue</p>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/25 text-[10px] font-bold leading-none">
                !
              </span>
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoFocus
                placeholder="Enter your username"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-[#0099D6] focus:outline-none focus:ring-2 focus:ring-[#0099D6]/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-11 text-sm text-white placeholder-slate-500 transition focus:border-[#0099D6] focus:outline-none focus:ring-2 focus:ring-[#0099D6]/40"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0099D6] to-[#007AB8] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0099D6]/30 transition hover:from-[#00AAEC] hover:to-[#0088CC] focus:outline-none focus:ring-2 focus:ring-[#0099D6] focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          {BRAND_DISPLAY_NAME} &copy; {new Date().getFullYear()} &middot; All rights reserved
        </p>
      </div>
    </div>
  );
}
