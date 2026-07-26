"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const MilkSpoilageViewer = dynamic(() => import("@/components/simulations/MilkSpoilageViewer"), {
  ssr: false,
  loading: () => <div style={{ width: "100vw", height: "100vh", background: "#061423", display: "grid", placeItems: "center", color: "#7dd3fc" }}>Preparing the milk-spoilage investigation…</div>,
});

export default function MilkSpoilagePage() {
  return <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#061423" }}>
    <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(6,20,35,0.8)", color: "#f0f9ff", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>← Catalog</Link>
    <MilkSpoilageViewer />
  </div>;
}
