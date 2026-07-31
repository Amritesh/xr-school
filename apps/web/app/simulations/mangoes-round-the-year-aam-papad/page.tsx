"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const AamPapadViewer = dynamic(() => import("@/components/simulations/AamPapadViewer"), {
  ssr: false,
  loading: () => <div style={{ width: "100vw", height: "100vh", background: "#4a220b", display: "grid", placeItems: "center", color: "#fef08a" }}>Preparing the aam-papad workshop…</div>,
});

export default function AamPapadPage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#4a220b" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(38,20,9,0.8)", color: "#fffbeb", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>← Catalog</Link>
      <AamPapadViewer />
    </div>
  );
}
