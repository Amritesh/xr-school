"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const MosquitoLifeCycleViewer = dynamic(
  () => import("@/components/simulations/MosquitoLifeCycleViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#102a2d", display: "grid", placeItems: "center", color: "#67e8f9" }}>
        Preparing the mosquito wetland nursery…
      </div>
    ),
  },
);

export default function MosquitoLifeCyclePage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#102a2d" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(16,42,45,0.82)", color: "#ecfeff", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <MosquitoLifeCycleViewer />
    </div>
  );
}
