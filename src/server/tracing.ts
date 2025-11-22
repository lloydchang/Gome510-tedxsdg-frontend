// File: src/server/tracing.ts
import { HoneycombSDK } from "@honeycombio/opentelemetry-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

// Define a minimal type for the SDK instance with the methods you use
type HoneycombServerClient = {
  start: () => void;
  stop: () => void;
};

// Initialize Honeycomb
let sdk: HoneycombServerClient | undefined;

try {
  sdk = new HoneycombSDK({
    serviceName: "tedxsdg-api",
    instrumentations: [getNodeAutoInstrumentations()],
  }) as unknown as HoneycombServerClient;

  sdk.start();
  console.log("Server-side Honeycomb tracing initialized");
} catch (err) {
  console.error("Error initializing server tracing", err);
}

// Optionally export the instance if you need to stop it elsewhere
export { sdk };
