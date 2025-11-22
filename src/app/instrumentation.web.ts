import { HoneycombWebSDK } from '@honeycombio/opentelemetry-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

const sdk = new HoneycombWebSDK({
  apiKey: process.env.NEXT_PUBLIC_HONEYCOMB_API_KEY,
  serviceName: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || 'tedxsdg-frontend-web',
  instrumentations: [getWebAutoInstrumentations()],
});

sdk.start();
