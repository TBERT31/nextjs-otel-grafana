# OpenTelemetry with Grafana Tempo and Node.js

This project demonstrates distributed tracing using OpenTelemetry, Grafana Tempo, and Grafana.

## Components

1. **Grafana**: Visualization platform
2. **Grafana Tempo**: Distributed tracing backend
3. **Grafana Loki**: Log aggregation system
4. **OpenTelemetry Collector**: Telemetry collection and processing pipeline
5. **Node.js Application**: Todo application with PostgreSQL backend and OpenTelemetry auto-instrumentation
6. **PostgreSQL**: Database to store todo items

## Architecture

```
┌─────────┐    OTLP     ┌─────────────────┐    OTLP     ┌────────┐    Query   ┌─────────┐
│ Node.js ├────────────►│ OTEL Collector  ├────────────►│ Tempo  │◄───────────┤ Grafana │
└────┬────┘             └───────┬─────────┘             └────────┘            └─────────┘
     │                          │                                                  ▲
     │ SQL                      │ Logs                 ┌────────┐    Query         │
     ▼                          ▼                      │  Loki  │◄─────────────────┘
┌─────────┐              ┌─────────────┐               │        │
│ Postgres│              │  Promtail   ├──────────────►│        │
└─────────┘              └─────────────┘               └────────┘
```

## Prerequisites

- Docker
- Docker Compose

## Getting Started

1. Clone this repository
2. Run the docker compose file:

```bash
docker compose up -d
```

3. Access the services:
   - Grafana: http://localhost:3000
   - Node.js Application (Todo App): http://localhost:8080
   - OpenTelemetry Collector metrics: http://localhost:8888

### Troubleshooting

#### Node.js Application

If you encounter errors with the Node.js application related to tracing:

1. **Promise Error in Tracing**: If you see an error like `TypeError: Cannot read properties of undefined (reading 'then')` in the logs, this is caused by the OpenTelemetry SDK's `start()` method not returning a Promise as expected. The fix is to wrap the call in `Promise.resolve()`:

```javascript
// In app/tracing.js
const startSdk = () => {
  return Promise.resolve(sdk.start());
};

startSdk()
  .then(() => console.log("Tracing initialized"))
  .catch((error) => console.error("Error initializing tracing", error));
```

2. After making changes to the Node.js application code, rebuild the container:

```bash
docker-compose up -d --build node-app
```

## Using the Todo App

The Todo application provides a simple interface to:
- View existing todos
- Add new todos
- Mark todos as complete
- Delete todos

All of these actions are traced using OpenTelemetry, with database operations being captured as spans.

## OpenTelemetry Auto-Instrumentation

The Node.js application demonstrates automatic instrumentation using OpenTelemetry:

1. **Zero-Code Approach**: The application uses the OpenTelemetry Node.js SDK with auto-instrumentations
2. **Framework Support**: Automatic instrumentation for Express.js, HTTP, and PostgreSQL
3. **Configuration via Environment**: All OpenTelemetry settings configured via environment variables

This approach shows how to get tracing with minimal code changes, making it ideal for existing applications.

## View Traces in Grafana

For trace analysis, you can view traces in Grafana:

1. Go to Grafana at http://localhost:3000
2. Navigate to Explore
3. Select Tempo as the data source
4. Use TraceQL to query traces
5. Try filtering for database operations by searching for spans with names like `pg.query`

## Structure

- `docker compose.yml`: Main configuration file for all services
- `app/`: Contains Node.js application with OpenTelemetry instrumentation
- `tempo/`: Contains Tempo configuration
- `grafana/`: Contains Grafana provisioning files
- `otel-collector/`: Contains OpenTelemetry Collector configuration
- `postgres/`: Contains PostgreSQL initialization scripts

## OpenTelemetry Collector

The OpenTelemetry Collector serves as an intermediary between your applications and observability backends. It provides:

1. **Telemetry Collection**: Receives traces, metrics, and logs from instrumented applications
2. **Processing**: Batches, filters, and enriches telemetry data
3. **Export**: Sends processed data to one or more backends

In this setup, the collector:
- Receives OTLP data from the Node.js application via gRPC (port 4317)
- Processes the data (batching, resource attribute addition)
- Exports traces to Tempo and also logs them for debugging

## PostgreSQL Integration

The Todo application uses PostgreSQL to store and retrieve todo items. Each database operation is traced using OpenTelemetry, allowing you to see the performance of your database operations and how they impact the overall request.

## Trace Querying

The application provides multiple ways to query and view traces:

1. **Grafana Tempo**: Access via Grafana
   - Advanced querying with TraceQL
   - Integration with other observability data
   - Sophisticated visualization options

## Logs and Traces

This project uses Grafana Loki for log aggregation and connects logs to traces for a seamless debugging experience:

1. **Structured Logging**: The application produces structured logs in JSON format with embedded trace IDs
2. **Log Collection**: Promtail collects logs from the application container
3. **Trace Context**: Each log entry contains the trace ID when it's part of a traced operation
4. **Log-to-Trace Correlation**: In Grafana, you can navigate from logs to traces and vice versa

### Viewing Correlated Logs and Traces

1. Go to Grafana at http://localhost:3000
2. Navigate to Explore
3. Select Loki as the data source
4. Query logs with: `{container="node-app"}`
5. Find a log with a trace ID and click on the trace link to jump directly to the trace details
6. Alternatively, when viewing a trace, you can see related logs that share the same trace ID

This powerful correlation makes debugging much easier by connecting what happened (logs) with the execution flow (traces).

## Notes

- Tempo is configured to store traces locally with a retention period of 1 hour
- The Node.js application uses OpenTelemetry to send traces to the collector
- The collector forwards traces to Tempo
- Grafana is configured with anonymous access for easy exploration