"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/lib/onboarding-actions";

// ─── Slug helper (mirrors server-side) ───────────────────────────────────────
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || ""
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor:
              i < current
                ? "#ffffff"
                : i === current
                  ? "#3b6fe8"
                  : "#1e2a3b",
            transition: "background-color 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Step 1 — Workspace name ─────────────────────────────────────────────────
function Step1({
  workspaceName,
  setWorkspaceName,
  onNext,
}: {
  workspaceName: string;
  setWorkspaceName: (v: string) => void;
  onNext: () => void;
}) {
  const slug = slugify(workspaceName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div>
      <p className="text-xs font-medium tracking-widest uppercase mb-8" style={{ color: "#8892a4" }}>
        Step 1 of 3
      </p>
      <h1 className="text-2xl font-semibold text-white mb-2" style={{ textWrap: "balance" as never }}>
        Name your workspace
      </h1>
      <p className="text-sm mb-10" style={{ color: "#8892a4" }}>
        This is what your clients will see when they log in.
      </p>

      <div className="flex flex-col gap-1.5 mb-3">
        <label htmlFor="workspaceName" className="text-sm font-medium text-white">
          Workspace name
        </label>
        <input
          ref={inputRef}
          id="workspaceName"
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Agency name, your name, or your brand"
          className="rounded-lg px-3.5 py-3 text-sm text-white placeholder:text-[#8892a4] focus:outline-none focus:ring-1"
          style={{
            background: "#0a0f1e",
            border: "1px solid #1e2a3b",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#3b6fe8")}
          onBlur={(e) => (e.target.style.borderColor = "#1e2a3b")}
          onKeyDown={(e) => { if (e.key === "Enter" && workspaceName.trim()) onNext(); }}
        />
      </div>

      {slug && (
        <p className="text-xs mb-10" style={{ color: "#8892a4" }}>
          clovior.com/<span style={{ color: "#ffffff80" }}>{slug}</span>
        </p>
      )}
      {!slug && <div className="mb-10" />}

      <button
        onClick={onNext}
        disabled={!workspaceName.trim()}
        className="w-full rounded-lg py-3 text-sm font-medium text-white transition-colors"
        style={{
          background: workspaceName.trim() ? "#3b6fe8" : "#1e2a3b",
          cursor: workspaceName.trim() ? "pointer" : "not-allowed",
        }}
      >
        Continue
      </button>
    </div>
  );
}

// ─── Step 2 — Add first client ───────────────────────────────────────────────
function Step2({
  clientName,
  setClientName,
  clientEmail,
  setClientEmail,
  onNext,
  onSkip,
}: {
  clientName: string;
  setClientName: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canContinue = clientName.trim() && clientEmail.trim();

  return (
    <div>
      <p className="text-xs font-medium tracking-widest uppercase mb-8" style={{ color: "#8892a4" }}>
        Step 2 of 3
      </p>
      <h1 className="text-2xl font-semibold text-white mb-2" style={{ textWrap: "balance" as never }}>
        Add your first client
      </h1>
      <p className="text-sm mb-10" style={{ color: "#8892a4" }}>
        They&apos;ll receive an invitation to join your workspace.
      </p>

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clientName" className="text-sm font-medium text-white">
            Client name
          </label>
          <input
            ref={inputRef}
            id="clientName"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Sarah Johnson"
            className="rounded-lg px-3.5 py-3 text-sm text-white placeholder:text-[#8892a4] focus:outline-none focus:ring-1"
            style={{ background: "#0a0f1e", border: "1px solid #1e2a3b", transition: "border-color 0.2s" }}
            onFocus={(e) => (e.target.style.borderColor = "#3b6fe8")}
            onBlur={(e) => (e.target.style.borderColor = "#1e2a3b")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="clientEmail" className="text-sm font-medium text-white">
            Client email
          </label>
          <input
            id="clientEmail"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="sarah@example.com"
            className="rounded-lg px-3.5 py-3 text-sm text-white placeholder:text-[#8892a4] focus:outline-none focus:ring-1"
            style={{ background: "#0a0f1e", border: "1px solid #1e2a3b", transition: "border-color 0.2s" }}
            onFocus={(e) => (e.target.style.borderColor = "#3b6fe8")}
            onBlur={(e) => (e.target.style.borderColor = "#1e2a3b")}
            onKeyDown={(e) => { if (e.key === "Enter" && canContinue) onNext(); }}
          />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full rounded-lg py-3 text-sm font-medium text-white mb-4 transition-colors"
        style={{
          background: canContinue ? "#3b6fe8" : "#1e2a3b",
          cursor: canContinue ? "pointer" : "not-allowed",
        }}
      >
        Continue
      </button>

      <button
        onClick={onSkip}
        className="w-full py-2 text-sm transition-colors"
        style={{ color: "#8892a4" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#8892a4")}
      >
        Skip for now
      </button>
    </div>
  );
}

// ─── Step 3 — Success + submit ────────────────────────────────────────────────
function Step3({
  workspaceName,
  clientName,
  clientEmail,
  skippedClient,
  error,
  isPending,
}: {
  workspaceName: string;
  clientName: string;
  clientEmail: string;
  skippedClient: boolean;
  error: string | null;
  isPending: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <p className="text-xs font-medium tracking-widest uppercase mb-8" style={{ color: "#8892a4" }}>
        Step 3 of 3
      </p>

      <div className="mb-3" style={{ fontSize: 32 }}>✓</div>
      <h1 className="text-2xl font-semibold text-white mb-2" style={{ textWrap: "balance" as never }}>
        You&apos;re ready
      </h1>
      <p className="text-sm mb-10" style={{ color: "#8892a4" }}>
        Here&apos;s what we set up for you.
      </p>

      <div
        className="rounded-lg p-5 mb-10 flex flex-col gap-4"
        style={{ background: "#111827", border: "1px solid #1e2a3b" }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase tracking-widest" style={{ color: "#8892a4" }}>Workspace</span>
          <span className="text-sm font-medium text-white">{workspaceName}</span>
        </div>
        <div style={{ height: 1, background: "#1e2a3b" }} />
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase tracking-widest" style={{ color: "#8892a4" }}>First client</span>
          <span className="text-sm font-medium" style={{ color: skippedClient ? "#8892a4" : "#ffffff" }}>
            {skippedClient ? "Not added yet" : clientName}
          </span>
        </div>
        {!skippedClient && clientEmail && (
          <>
            <div style={{ height: 1, background: "#1e2a3b" }} />
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-widest" style={{ color: "#8892a4" }}>Invite sent to</span>
              <span className="text-sm" style={{ color: "#8892a4" }}>{clientEmail}</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm mb-4" style={{ color: "#ef4444" }} role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg py-3 text-sm font-medium text-white transition-opacity"
        style={{
          background: "#3b6fe8",
          opacity: isPending ? 0.6 : 1,
          cursor: isPending ? "not-allowed" : "pointer",
        }}
      >
        {isPending ? "Setting up…" : "Go to your workspace"}
      </button>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [skippedClient, setSkippedClient] = useState(false);

  const [state, formAction, isPending] = useActionState(completeOnboarding, null);

  function goToStep2() {
    if (workspaceName.trim()) setStep(1);
  }

  function goToStep3WithClient() {
    setSkippedClient(false);
    setStep(2);
  }

  function goToStep3Skipped() {
    setSkippedClient(true);
    setClientName("");
    setClientEmail("");
    setStep(2);
  }

  return (
    <main
      className="flex min-h-screen flex-1 items-center justify-center px-4"
      style={{ background: "#0a0f1e" }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Progress dots */}
        <div className="flex justify-center mb-12">
          <StepDots current={step} total={3} />
        </div>

        {step === 0 && (
          <Step1
            workspaceName={workspaceName}
            setWorkspaceName={setWorkspaceName}
            onNext={goToStep2}
          />
        )}

        {step === 1 && (
          <Step2
            clientName={clientName}
            setClientName={setClientName}
            clientEmail={clientEmail}
            setClientEmail={setClientEmail}
            onNext={goToStep3WithClient}
            onSkip={goToStep3Skipped}
          />
        )}

        {step === 2 && (
          <form action={formAction}>
            {/* Hidden fields carry the collected data to the server action */}
            <input type="hidden" name="workspaceName" value={workspaceName} />
            <input type="hidden" name="clientName" value={skippedClient ? "" : clientName} />
            <input type="hidden" name="clientEmail" value={skippedClient ? "" : clientEmail} />

            <Step3
              workspaceName={workspaceName}
              clientName={clientName}
              clientEmail={clientEmail}
              skippedClient={skippedClient}
              error={state?.error ?? null}
              isPending={isPending}
            />
          </form>
        )}
      </div>
    </main>
  );
}
