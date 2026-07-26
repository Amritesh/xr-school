"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const VitaminDeficiencyViewer = dynamic(
  () => import("@/components/simulations/VitaminDeficiencyViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#061321",
          display: "grid",
          placeItems: "center",
          color: "#94a3b8",
        }}
      >
        Preparing the nutrition discovery lab…
      </div>
    ),
  },
);

export default function ComponentsOfFoodVitaminsDeficienciesPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#061321",
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
          background: "rgba(0,0,0,0.58)",
          color: "#e5e7eb",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <VitaminDeficiencyViewer />
    </div>
  );
}
