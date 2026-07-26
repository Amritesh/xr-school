"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const SeedDispersalViewer = dynamic(
  () => import("@/components/simulations/SeedDispersalViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#102418", display: "grid", placeItems: "center", color: "#86efac" }}>
        Preparing the seed-dispersal habitat…
      </div>
    ),
  },
);

export default function SeedDispersalPage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#102418" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(16,36,24,0.82)", color: "#f0fdf4", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <SeedDispersalViewer />
    </div>
  );
}
