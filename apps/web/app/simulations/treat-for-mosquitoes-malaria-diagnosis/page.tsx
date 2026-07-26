"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const MalariaDiagnosisViewer = dynamic(
  () => import("@/components/simulations/MalariaDiagnosisViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#142a3a", display: "grid", placeItems: "center", color: "#7dd3fc" }}>
        Preparing the malaria diagnosis laboratory…
      </div>
    ),
  },
);

export default function MalariaDiagnosisPage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#142a3a" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(20,42,58,0.82)", color: "#f0f9ff", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <MalariaDiagnosisViewer />
    </div>
  );
}
