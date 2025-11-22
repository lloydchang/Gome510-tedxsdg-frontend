// File: src/app/components/observability.tsx
"use client";

import { useEffect } from "react";

const configDefaults = { ignoreNetworkEvents: true };

// Helper type for Honeycomb instance (we only care about start and stop)
type HoneycombClient = {
  start: () => void;
  stop: () => void;
};

export default function Observability() {
  useEffect(() => {
    let sdkInstance: HoneycombClient | undefined;

    (async () => {
      try {
        const { HoneycombWebSDK } = await import("@honeycombio/opentelemetry-web");
        const { getWebAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-web");

        sdkInstance = new HoneycombWebSDK({
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
        }) as unknown as HoneycombClient;

        sdkInstance.start();
        console.log("Honeycomb Web SDK initialized");
      } catch (err) {
        console.error("Honeycomb initialization failed", err);
      }
    })();

    return () => {
      sdkInstance?.stop();
    };
  }, []);

  return null;
}
