// tracing.js
const process = require("process");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");

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
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
      "@opentelemetry/instrumentation-http": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-express": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-pg": {
        enabled: true,
      },
    }),
  ],
});

// Start the SDK
// Wrap the start method with a promise if it doesn't return one
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
