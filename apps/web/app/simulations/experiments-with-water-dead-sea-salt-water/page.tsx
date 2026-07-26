"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const DeadSeaSaltWaterViewer = dynamic(
  () => import("@/components/simulations/DeadSeaSaltWaterViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#123047", display: "grid", placeItems: "center", color: "#67e8f9" }}>
        Preparing the Dead Sea experiment…
      </div>
    ),
  },
);

export default function DeadSeaSaltWaterPage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#123047" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(18,48,71,0.82)", color: "#f0fdff", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <DeadSeaSaltWaterViewer />
    </div>
  );
}
