"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const SolubleInsolubleViewer = dynamic(
  () => import("@/components/simulations/SolubleInsolubleViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#12342f", display: "grid", placeItems: "center", color: "#5eead4" }}>
        Preparing the solubility experiment…
      </div>
    ),
  },
);

export default function SolubleInsolublePage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#12342f" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(18,52,47,0.82)", color: "#f0fdfa", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <SolubleInsolubleViewer />
    </div>
  );
}
