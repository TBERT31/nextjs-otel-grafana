# Node.js Todo App with OpenTelemetry Zero-Code Instrumentation

This application demonstrates how to use OpenTelemetry in a Node.js application using zero-code instrumentation.

## Features

- **Zero-Code Instrumentation**: Using environment variables and auto-instrumentation to trace application activities without manually adding spans
- **Express.js REST API**: Simple Todo API with CRUD operations
- **PostgreSQL Database**: For data persistence
- **Structured Logging**: JSON-formatted logs that include trace context

## Zero-Code Instrumentation Approach

This application uses zero-code instrumentation via the OpenTelemetry Node.js auto-instrumentation package. The key components are:

1. **Auto-instrumentation**: The `@opentelemetry/auto-instrumentations-node` package automatically instruments common libraries like Express, HTTP, and PostgreSQL

2. **Configuration via Environment Variables**: All OpenTelemetry settings are configured through environment variables:
   - `OTEL_SERVICE_NAME`: Sets the service name
   - `OTEL_EXPORTER_OTLP_ENDPOINT`: Defines the endpoint for the OTLP exporter
   - `OTEL_RESOURCE_ATTRIBUTES`: Additional resource attributes
   - `OTEL_TRACES_SAMPLER`: Sampling configuration
   - `OTEL_PROPAGATORS`: Propagators for distributed tracing

3. **Early SDK Initialization**: The tracing SDK is initialized at the start of the application before other imports to ensure all operations are captured

## How It Works

1. The tracing initialization happens in `tracing.js`, which is imported at the very beginning of the application
2. The NodeSDK is configured to use environment variables from the runtime
3. Auto-instrumentation automatically adds spans for:
   - HTTP requests
   - Express routes
   - Database queries
   - And more!

## Benefits

- **Simplified Code**: No need to manually create spans or manage trace context
- **Consistent Tracing**: Standardized approach to instrumentation across the codebase
- **Easy Configuration**: Change behavior through environment variables without code changes
- **Comprehensive Coverage**: Automatic instrumentation of common libraries and frameworks

## Deployment

The application is part of a Docker Compose setup that includes:
- Node.js application (this app)
- PostgreSQL database
- OpenTelemetry Collector
- Tempo (for trace storage)
- Grafana (for visualization)

To run the full stack:

```bash
docker-compose up -d
```

Then access the application at http://localhost:8080