"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/lib/actions";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : register, undefined);
  return (
    <form action={action} className="form auth-form">
      {mode === "register" && (
        <label className="field">
          <span>Dein Name</span>
          <input className="input" name="name" autoComplete="name" required minLength={2} />
        </label>
      )}
      <label className="field">
        <span>E-Mail</span>
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span>Passwort</span>
        <input className="input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : undefined} />
      </label>
      {state?.error && <p className="alert alert-error">{state.error}</p>}
      {state?.ok && <p className="alert alert-ok">{state.ok}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Zugang anfragen"}
      </button>
      <p className="muted small">
        {mode === "login" ? (
          <>
            Noch kein Zugang? <Link href="/register">Zugang anfragen</Link>
          </>
        ) : (
          <>
            Schon freigeschaltet? <Link href="/login">Anmelden</Link>
          </>
        )}
      </p>
    </form>
  );
}
