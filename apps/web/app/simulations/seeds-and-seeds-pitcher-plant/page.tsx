"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const PitcherPlantViewer = dynamic(() => import("@/components/simulations/PitcherPlantViewer"), {
  ssr: false,
  loading: () => <div style={{ width: "100vw", height: "100vh", background: "#07170d", display: "grid", placeItems: "center", color: "#bef264" }}>Preparing the pitcher-plant habitat…</div>,
});

export default function PitcherPlantPage() {
  return <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#07170d" }}>
    <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(16,32,22,0.8)", color: "#f7fee7", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>← Catalog</Link>
    <PitcherPlantViewer />
  </div>;
}
