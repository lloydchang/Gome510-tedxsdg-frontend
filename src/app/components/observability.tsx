// File: src/app/components/observability.tsx
"use client";
import { HoneycombWebSDK } from "@honeycombio/opentelemetry-web";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";

const configDefaults = { ignoreNetworkEvents: true };

export default function Observability() {
  try {
    const sdk = new HoneycombWebSDK({
      endpoint: "/api/honeycomb-proxy",
      debug: true,
      serviceName: "[YOUR APPLICATION NAME HERE]",
      instrumentations: [
        getWebAutoInstrumentations({
          "@opentelemetry/instrumentation-xml-http-request": configDefaults,
          "@opentelemetry/instrumentation-fetch": configDefaults,
          "@opentelemetry/instrumentation-document-load": configDefaults,
        }),
      ],
    });
    sdk.start();
  } catch {
    return null;
  }

  return null;
}
