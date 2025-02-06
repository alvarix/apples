import Fastify from 'fastify';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';

dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("Database connection error:", err));

const fastify = Fastify({ logger: true });
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/', // optional: default '/'
});

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

fastify.get('/api/expenses', async (_, reply) => {
  const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
  reply.send(rows);
});

fastify.get('/api/balance', async (_, reply) => {
  const { rows } = await pool.query(`
    SELECT 
      SUM(CASE WHEN payer = 'Adam' THEN amount ELSE 0 END) AS adam_paid,
      SUM(CASE WHEN payer = 'Eve' THEN amount ELSE 0 END) AS eve_paid
    FROM transactions
  `);
  reply.send({ balance: rows[0].adam_paid - rows[0].eve_paid });
});

export default async (req, res) => {
  await fastify.ready();
  fastify.server.emit('request', req, res);
};

fastify.get('/api/debug-env', async (_, reply) => {
  reply.send({ databaseUrl: process.env.DATABASE_URL || "Not Found" });
});

fastify.get('/', async (_, reply) => {
  return reply.sendFile('index.html');
});

fastify.setNotFoundHandler((request, reply) => {
  reply.sendFile('index.html', (err) => {
    if (err) {
      reply.status(500).send('Error serving index.html');
    }
  });
});


