"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const CampInSnowViewer = dynamic(
  () => import("@/components/simulations/CampInSnowViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#102238",
          display: "grid",
          placeItems: "center",
          color: "#7dd3fc",
        }}
      >
        Preparing the snowy mountain camp…
      </div>
    ),
  },
);

export default function CampInSnowPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#102238",
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
          background: "rgba(16,34,56,0.84)",
          color: "#f8fafc",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <CampInSnowViewer />
    </div>
  );
}
