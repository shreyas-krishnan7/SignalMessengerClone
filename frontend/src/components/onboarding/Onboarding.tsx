"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { SignalLogo } from "@/components/ui/misc";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { ProfileStep } from "./ProfileStep";

const COUNTRY_CODES = [
  { code: "+91", label: "India" },
  { code: "+1", label: "United States" },
  { code: "+44", label: "United Kingdom" },
  { code: "+61", label: "Australia" },
];

// Seed data wale users, evaluator ke liye ek click login
const DEMO_ACCOUNTS = [
  { name: "Aarav", number: "9000000001" },
  { name: "Priya", number: "9000000002" },
  { name: "Rohan", number: "9000000003" },
];

type Step = "phone" | "code" | "profile";

export function Onboarding() {
  const { user, login } = useAuth();
  // Login ho chuka hai par naam set nahi hua to seedha profile step
  const [step, setStep] = useState<Step>(user ? "profile" : "phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const phone = `${countryCode}${number.replace(/\D/g, "")}`;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function requestCode(event: React.FormEvent) {
    event.preventDefault();
    run(async () => {
      await api("/api/auth/request-otp", { method: "POST", body: { phone } });
      setCode("");
      setStep("code");
    });
  }

  // Demo account: number bhar ke seedha code wale step pe, code bhi pehle se bhara hua
  function loginWithDemo(demoNumber: string) {
    setCountryCode("+91");
    setNumber(demoNumber);
    run(async () => {
      await api("/api/auth/request-otp", { method: "POST", body: { phone: `+91${demoNumber}` } });
      setCode("123456");
      setStep("code");
    });
  }

  function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    run(async () => {
      const result = await api<{ token: string; user: User }>("/api/auth/verify-otp", {
        method: "POST",
        body: { phone, otp: code },
      });
      // Login ke baad AuthGate decide karega: naya user -> profile step, purana user -> main app
      login(result.token, result.user);
    });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-panel px-4 py-10">
      <div className="w-full max-w-sm">
        <SignalLogo size={56} className="mb-6 text-accent" />

        {step === "phone" && (
          <form onSubmit={requestCode}>
            <h1 className="text-2xl font-semibold">Phone number</h1>
            <p className="mt-2 text-sm text-secondary">Enter your phone number to get started.</p>

            <div className="mt-6 flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rounded-lg bg-input px-3 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent"
                aria-label="Country code"
              >
                {COUNTRY_CODES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code} {country.label}
                  </option>
                ))}
              </select>
              <input
                autoFocus
                type="tel"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Phone number"
                className="min-w-0 flex-1 rounded-lg bg-input px-3 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <button
              disabled={busy || number.replace(/\D/g, "").length < 6}
              className="mt-6 w-full rounded-full bg-accent py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Sending code..." : "Next"}
            </button>

            <div className="mt-8 rounded-lg border border-line p-3">
              <p className="text-xs text-secondary">Try a demo account (code 123456)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.number}
                    type="button"
                    onClick={() => loginWithDemo(account.number)}
                    className="rounded-full bg-input px-3 py-1 text-xs hover:bg-selected"
                  >
                    {account.name}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode}>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="mb-4 flex items-center gap-1 text-sm text-accent"
            >
              <ArrowLeft size={16} /> Wrong number?
            </button>
            <h1 className="text-2xl font-semibold">Verification code</h1>
            <p className="mt-2 text-sm text-secondary">
              Enter the code we sent to <span className="font-medium text-primary">{phone}</span>
            </p>

            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="mt-6 w-full rounded-lg bg-input px-3 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="mt-2 text-xs text-tertiary">Demo mode: the code is always 123456</p>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <button
              disabled={busy || code.length !== 6}
              className="mt-6 w-full rounded-full bg-accent py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Verifying..." : "Continue"}
            </button>
          </form>
        )}

        {step === "profile" && <ProfileStep />}
      </div>
    </div>
  );
}
