import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closeRedisClient } from './lib/redis/client.js';

async function start() {
  let app;

  try {
    app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 Finance Dashboard API');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📡 Server running at: http://${env.HOST}:${env.PORT}`);
    console.log(`📚 API Documentation: http://${env.HOST}:${env.PORT}/documentation`);
    console.log(`🏥 Health Check: http://${env.HOST}:${env.PORT}/health`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];

  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\n⚠️  Received ${signal}, gracefully shutting down...`);

      try {
        await app?.close();
        await closeRedisClient();
        console.log('✓ Server closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
  }
}

start();
