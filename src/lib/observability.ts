import { trace } from '@opentelemetry/api';

/**
 * Adds attributes to the current active span, effectively creating a "wide event".
 * Use this to add context to the current operation without creating a new span.
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>) {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Creates a new span for a specific operation.
 */
export function withSpan<T>(name: string, fn: (span: any) => Promise<T> | T): Promise<T> {
  const tracer = trace.getTracer('tedxsdg-frontend');
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
