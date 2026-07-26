"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const ShapeSortingViewer = dynamic(
  () => import("@/components/simulations/ShapeSortingViewer"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100vw", height: "100vh", background: "#0b1f1a", display: "grid", placeItems: "center", color: "#bbf7d0" }}>
        Preparing the shape-sorting table…
      </div>
    ),
  },
);

export default function SortingMaterialsByShapePage() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#0b1f1a" }}>
      <Link href="/simulations" style={{ position: "absolute", top: 16, left: 16, zIndex: 20, padding: "6px 14px", borderRadius: 8, background: "rgba(11,31,26,0.8)", color: "#ecfdf5", fontSize: "0.85rem", backdropFilter: "blur(4px)" }}>
        ← Catalog
      </Link>
      <ShapeSortingViewer />
    </div>
  );
}
