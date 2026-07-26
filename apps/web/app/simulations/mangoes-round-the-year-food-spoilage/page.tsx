"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const FoodSpoilageViewer = dynamic(() => import("@/components/simulations/FoodSpoilageViewer"), {
  ssr: false,
  loading: () => <div style={{ width: "100vw", height: "100vh", background: "#25130a", display: "grid", placeItems: "center", color: "#fdba74" }}>Preparing the food-spoilage investigation…</div>,
});

export default function FoodSpoilagePage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#25130a" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(35,19,11,0.8)", color: "#fff7ed", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>← Catalog</Link>
      <FoodSpoilageViewer />
    </div>
  );
}
