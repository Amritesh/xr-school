"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const StepwellStructureViewer = dynamic(
  () => import("@/components/simulations/StepwellStructureViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#21170f", display: "grid", placeItems: "center", color: "#f5c16c" }}>
        Preparing the stepwell…
      </div>
    ),
  },
);

export default function StepwellStructurePage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#21170f" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(33,23,15,0.82)", color: "#fff7ed", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <StepwellStructureViewer />
    </div>
  );
}
