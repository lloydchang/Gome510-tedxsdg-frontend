// File: src/server/tracing.ts
import { HoneycombSDK } from '@honeycombio/opentelemetry-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Uses environment variables named HONEYCOMB_API_KEY and OTEL_SERVICE_NAME
const sdk = new HoneycombSDK({
  serviceName: 'tedxsdg-api',
  instrumentations: [getNodeAutoInstrumentations()],
});

try {
  sdk.start();
  console.log('Server-side tracing initialized');
} catch (err) {
  console.error('Error initializing server tracing', err);
}
