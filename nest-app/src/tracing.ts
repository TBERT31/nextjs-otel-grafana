import * as dotenv from 'dotenv';
dotenv.config();

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Registry, collectDefaultMetrics, Counter } from 'prom-client';

declare global {
  var metrics: {
    registry: Registry;
    userSignups: Counter;
  } | undefined;
}

const prometheusRegistry = new Registry();
collectDefaultMetrics({
  register: prometheusRegistry
});

const userSignups = new Counter({
  name: 'user_signups_total',
  help: 'Total number of user signups',
  labelNames: ['plan_type', 'referral_source'],
  registers: [prometheusRegistry]
});

globalThis.metrics = {
  registry: prometheusRegistry,
  userSignups
};

// This file sets up zero-code instrumentation using environment variables
// The following environment variables are supported:
// - OTEL_SERVICE_NAME: Name of the service
// - OTEL_EXPORTER_OTLP_ENDPOINT: Endpoint for the OTLP exporter
// - OTEL_RESOURCE_ATTRIBUTES: Comma-separated list of resource attributes
// - OTEL_TRACES_SAMPLER: Sampler to use for traces
// - OTEL_PROPAGATORS: Propagators to use

// Create and configure the OpenTelemetry SDK
// All configuration comes from environment variables
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'nest-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-nestjs-core': {
        enabled: true,
      },
    }),
  ],
});

// Start the SDK
const startSdk = () => {
  return Promise.resolve(sdk.start());
};

startSdk()
  .then(() => console.log("Tracing initialized"))
  .catch((error) => console.error("Error initializing tracing", error));

// Gracefully shut down the SDK on process exit
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((error) => console.error("Error terminating tracing", error))
    .finally(() => process.exit(0));
});

module.exports = sdk;