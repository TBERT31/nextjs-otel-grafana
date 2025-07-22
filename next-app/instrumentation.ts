import { Registry, collectDefaultMetrics, Counter } from 'prom-client';

declare global {
  var metrics: {
    registry: Registry;
    userSignups: Counter;
  } | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = require('@opentelemetry/sdk-node')
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc')
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')

    // Utiliser les variables d'environnement
    const serviceName = process.env.OTEL_SERVICE_NAME || 'next-app'
    const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0'
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'

    console.log('OpenTelemetry Configuration:')
    console.log(`Service: ${serviceName}`)
    console.log(`Version: ${serviceVersion}`)
    console.log(`Endpoint: ${otlpEndpoint}`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

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

    const sdk = new NodeSDK({
      serviceName,
      serviceVersion,
      traceExporter: new OTLPTraceExporter({
        url: otlpEndpoint,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-dns': { enabled: false },
          '@opentelemetry/instrumentation-net': { enabled: false },
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: false },
          '@opentelemetry/instrumentation-pg': { enabled: true },
        }),
      ],
    })

    try {
      sdk.start()
      console.log('🚀 OpenTelemetry started successfully')
    } catch (error) {
      console.error('❌ OpenTelemetry startup error:', error)
    }

    // Arrêt propre
    process.on('SIGTERM', async () => {
      try {
        await sdk.shutdown()
        console.log('✅ OpenTelemetry shutdown completed')
      } catch (error) {
        console.error('❌ OpenTelemetry shutdown error:', error)
      }
    })
  }
}
