import { HoneycombSDK } from '@honeycombio/opentelemetry-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new HoneycombSDK({
  apiKey: process.env.HONEYCOMB_API_KEY,
  serviceName: process.env.OTEL_SERVICE_NAME || 'tedxsdg-frontend',
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
