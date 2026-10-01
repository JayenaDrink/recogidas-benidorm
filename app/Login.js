"use client";
import { useState } from "react";

export default function Login() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (r.ok) return window.location.reload();
      const j = await r.json().catch(() => ({}));
      setError(j.error || "No se pudo entrar.");
    } catch {
      setError("Sin conexión. Inténtalo de nuevo.");
    }
    setBusy(false);
  }

  return (
    <form className="login" onSubmit={submit}>
      <label htmlFor="code" className="label">Código del grupo</label>
      <p className="hint">Te lo pasa Nick por WhatsApp. Solo hay que ponerlo una vez en cada móvil.</p>
      <div className="login-row">
        <input
          id="code"
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="••••"
        />
        <button className="btn" type="submit" disabled={busy || !code.trim()}>
          Entrar
        </button>
      </div>
      {error && <p className="banner err">{error}</p>}
    </form>
  );
}
