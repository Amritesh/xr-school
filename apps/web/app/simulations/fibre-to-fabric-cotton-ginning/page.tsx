"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const CottonGinningViewer = dynamic(
  () => import("@/components/simulations/CottonGinningViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#172033",
          display: "grid",
          placeItems: "center",
          color: "#fde68a",
        }}
      >
        Preparing the cotton-ginning workshop…
      </div>
    ),
  },
);

export default function FibreToFabricCottonGinningPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#172033",
      }}
    >
      <Link
        href="/simulations"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 20,
          padding: "6px 14px",
          borderRadius: 8,
          background: "rgba(17,24,39,0.78)",
          color: "#f9fafb",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <CottonGinningViewer />
    </div>
  );
}
