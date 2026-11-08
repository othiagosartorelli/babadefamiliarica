"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { Button, CrownIcon } from "./ui";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Preencha o e-mail e a senha.");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <main className="login-wrap">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          <CrownIcon size={22} color="#3E1C2F" />
        </div>
        <p className="eyebrow">Painel da administração</p>
        <h1 id="login-title" className="login-title">
          Babá de Família Rica
        </h1>
        <p className="login-sub">Entre com o e-mail e a senha da sua conta de administradora.</p>

        <form onSubmit={onSubmit} noValidate className="form">
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              placeholder="voce@exemplo.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          {error ? (
            <p id="login-error" className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" busy={busy} className="btn-block">
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </section>
      <p className="login-foot">Acesso restrito à equipe da Ana Maldonado.</p>
    </main>
  );
}
