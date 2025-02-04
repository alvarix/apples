import Fastify from 'fastify';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const fastify = Fastify();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

fastify.get('/expenses', async (_, reply) => {
  const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
  reply.send(rows);
});

fastify.post('/add-expense', async (req, reply) => {
  const { payer, amount, description } = req.body;
  await pool.query(
    'INSERT INTO transactions (payer, amount, description) VALUES ($1, $2, $3)',
    [payer, amount, description]
  );
  reply.send({ success: true });
});

fastify.get('/balance', async (_, reply) => {
  const { rows } = await pool.query(`
    SELECT 
      SUM(CASE WHEN payer = 'Adam' THEN amount ELSE 0 END) AS adam_paid,
      SUM(CASE WHEN payer = 'Eve' THEN amount ELSE 0 END) AS eve_paid
    FROM transactions
  `);
  const balance = rows[0].adam_paid - rows[0].eve_paid;
  reply.send({ balance });
});

fastify.listen({ port: 3000 }, () => console.log('Server running'));