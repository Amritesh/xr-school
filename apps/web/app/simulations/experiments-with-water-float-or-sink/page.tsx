"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const FloatOrSinkViewer = dynamic(
  () => import("@/components/simulations/FloatOrSinkViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#082f49", display: "grid", placeItems: "center", color: "#7dd3fc" }}>
        Preparing the float-or-sink experiment…
      </div>
    ),
  },
);

export default function FloatOrSinkPage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#082f49" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(8,47,73,0.82)", color: "#f0f9ff", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <FloatOrSinkViewer />
    </div>
  );
}
