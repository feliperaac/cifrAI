import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';
import { createOracleDatabase } from './db/oracle.js';

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig(process.env);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(JSON.stringify({ level: 'fatal', msg: err.message }));
      process.exit(1);
    }
    throw err;
  }

  const db = await createOracleDatabase(config.oracle);
  const app = await buildApp({ config, db });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'shutting down');
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    try {
      await app.close();
      await db.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: config.host, port: config.port });
}

main().catch((err: unknown) => {
  console.error(
    JSON.stringify({
      level: 'fatal',
      msg: 'startup failed',
      error: String((err as Error)?.message).split('\n')[0],
    }),
  );
  process.exit(1);
});
