// File: src/app/components/ObservabilityWrapper.tsx
"use client";

import dynamic from "next/dynamic";

// Dynamically import the Observability component, disable SSR
const Observability = dynamic(() => import("./observability"), { ssr: false });

export default function ObservabilityWrapper() {
  return <Observability />;
}
