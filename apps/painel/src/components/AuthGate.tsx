"use client";

import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { LoginScreen } from "./LoginScreen";
import { Shell } from "./Shell";
import { Button, CrownIcon, Loading } from "./ui";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, error, retry, signOut, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="center-screen">
        <Loading label="Abrindo o painel…" />
      </div>
    );
  }

  if (status === "signedOut") return <LoginScreen />;

  if (status === "error") {
    return (
      <div className="center-screen">
        <div className="login-card">
          <h1 className="login-title">Não foi possível abrir o painel</h1>
          <p className="login-sub">{error}</p>
          <div className="row-actions">
            <Button onClick={retry}>Tentar de novo</Button>
            <Button variant="secondary" onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "notAdmin") {
    return (
      <div className="center-screen">
        <div className="login-card">
          <div className="brand-mark" aria-hidden="true">
            <CrownIcon size={22} color="#3E1C2F" />
          </div>
          <h1 className="login-title">Esta conta não tem acesso ao painel</h1>
          <p className="login-sub">
            Você entrou como <strong>{user?.email}</strong>. O painel é só para a administração. Se achar que é um engano,
            fale com a equipe técnica.
          </p>
          <Button onClick={() => void signOut()} className="btn-block">
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return <Shell>{children}</Shell>;
}
