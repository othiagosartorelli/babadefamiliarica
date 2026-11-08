"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { CrownIcon } from "./ui";

const NAV = [
  { href: "/", label: "Visão geral" },
  { href: "/babas", label: "Babás" },
  { href: "/maes", label: "Mães" },
  { href: "/selos", label: "Selos e Greenn" },
  { href: "/revisoes", label: "Pedidos de revisão" },
  { href: "/conteudos", label: "Conteúdos" },
  { href: "/ranking", label: "Ranking e prêmios" },
  { href: "/financeiro", label: "Financeiro" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark brand-mark-sm" aria-hidden="true">
            <CrownIcon size={16} color="#3E1C2F" />
          </span>
          <div>
            <p className="sidebar-title">Babá de Família Rica</p>
            <p className="sidebar-sub">Painel da Ana</p>
          </div>
        </div>
        <nav aria-label="Seções do painel">
          <ul className="nav">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={active ? "nav-link active" : "nav-link"} aria-current={active ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="sidebar-user">
          <p className="sidebar-user-name">{profile?.full_name ?? "Administradora"}</p>
          <button type="button" className="link-btn" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </aside>
      <main className="content" id="conteudo">
        {children}
      </main>
    </div>
  );
}
