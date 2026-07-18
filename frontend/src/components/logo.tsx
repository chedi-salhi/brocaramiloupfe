"use client";

import { useState } from "react";

// Essaie d'abord /public/logo.png (dépose le vrai logo BRC là). Si le fichier
// n'existe pas encore, bascule automatiquement sur une marque SVG de secours
// dans les mêmes tons rouge/noir, pour ne jamais casser l'interface en
// attendant le vrai fichier.
export function Logo({ size = 36 }: { size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo.png"
        alt="Brocaramilou"
        width={size}
        height={size}
        className="rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Brocaramilou"
    >
      <circle cx="24" cy="24" r="22" fill="var(--ink)" />
      <path d="M24 4a20 20 0 1 0 14.1 34.1A22 22 0 0 1 24 4Z" fill="var(--brand)" />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="white"
        fontFamily="var(--font-sans), Arial, sans-serif"
      >
        BRC
      </text>
    </svg>
  );
}
