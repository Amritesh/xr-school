"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const CottonFarmingViewer = dynamic(
  () => import("@/components/simulations/CottonFarmingViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#9bd7ff",
          display: "grid",
          placeItems: "center",
          color: "#14532d",
        }}
      >
        Preparing the cotton field…
      </div>
    ),
  },
);

export default function FibreToFabricCottonFarmingPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#9bd7ff",
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
          background: "rgba(5,46,22,0.72)",
          color: "#f0fdf4",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <CottonFarmingViewer />
    </div>
  );
}
