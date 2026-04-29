"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { BRAND_DISPLAY_NAME } from "@/config/branding";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);

    // Absolute URL so NextAuth’s client can parse `data.url` (relative URLs throw in `new URL(data.url)`).
    // Full page navigation ensures the session cookie is sent on the next request (SPA push can race in prod).
    const callbackUrl =
      typeof window !== "undefined" ? new URL("/dashboard", window.location.origin).href : "/dashboard";

    try {
      const res = await signIn("credentials", {
        username: form.get("username"),
        password: form.get("password"),
        redirect: false,
        callbackUrl,
      });

      setLoading(false);
      if (res?.ok) {
        window.location.assign(callbackUrl);
        return;
      }
      if (res?.error === "CredentialsSignin") {
        setError("Invalid username or password");
      } else if (res?.error) {
        setError("Sign-in failed. Please try again.");
      } else {
        setError("Invalid username or password");
      }
    } catch {
      setLoading(false);
      setError("Sign-in could not complete. Refresh the page or try again.");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020d1f] flex items-center justify-center px-4">
      {/* Decorative blobs — AMB brand blue */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-64 -left-64 h-[600px] w-[600px] rounded-full bg-[#0099D6]/20 blur-[140px]" />
        <div className="absolute -bottom-64 -right-64 h-[600px] w-[600px] rounded-full bg-[#0099D6]/10 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#004F7C]/15 blur-[120px]" />
      </div>

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,153,214,0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-2xl shadow-[#0099D6]/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/amb_logo.png" alt="AMB Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">AMB</h1>
          <p className="mt-1.5 text-sm font-medium tracking-wide text-[#0099D6]">Super Foods</p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-slate-400">Sign in to your account to continue</p>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/25 text-[10px] font-bold leading-none">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
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
