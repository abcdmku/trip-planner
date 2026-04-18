import 'dotenv/config';
import { listenPort } from './config';
import { buildApp } from './app';

const app = buildApp();

const start = async () => {
  try {
    await app.listen({
      host: '0.0.0.0',
      port: listenPort,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
