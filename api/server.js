import Fastify from 'fastify';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const fastify = Fastify();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

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