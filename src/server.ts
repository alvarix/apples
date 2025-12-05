import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormBody from '@fastify/formbody';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import expensesRoutes from './routes/expenses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function build(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify(opts);

  // Parse form and JSON bodies
  app.register(fastifyFormBody);

  // Serve static files from public directory
  app.register(fastifyStatic, {
    root: join(__dirname, '../public'),
    prefix: '/'
  });

  // Register routes
  app.register(expensesRoutes, { prefix: '/api' });

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok' };
  });

  return app;
}

export async function start() {
  const app = await build({
    logger: {
      level: 'info'
    }
  });

  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
