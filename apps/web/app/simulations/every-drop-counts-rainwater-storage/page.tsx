"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const RainwaterStorageViewer = dynamic(
  () => import("@/components/simulations/RainwaterStorageViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#0c2230", display: "grid", placeItems: "center", color: "#67e8f9" }}>
        Preparing the rainwater system…
      </div>
    ),
  },
);

export default function RainwaterStoragePage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#0c2230" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(12,34,48,0.82)", color: "#ecfeff", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <RainwaterStorageViewer />
    </div>
  );
}
