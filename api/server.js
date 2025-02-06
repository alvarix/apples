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

  const fastify = Fastify({
    logger: {
      level: 'warn' // only log warnings and errors (suppress info logs)
    }
  });

fastify.register(formbody);
import formbody from '@fastify/formbody';
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

fastify.get('/api/expenses', async (request, reply) => {
  try {
    // Query all transactions, ordered by date descending.
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');

    // Build an HTML unordered list from the query results.
    let html = '<ul>';
    rows.forEach(expense => {
      html += `<li>${expense.description} - ${expense.amount} - ${expense.payer}</li>`;
    });
    html += '</ul>';

    // Send the HTML fragment with the appropriate content type.
    reply.type('text/html').send(html);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    reply.status(500).send('Error fetching expenses');
  }
});

/**
 * GET /api/balance
 *
 * Calculates the net balance between Adam and Eve and returns an HTML message.
 * If the balance is positive, Eve owes Adam; if negative, Adam owes Eve; if zero, it's all settled.
 *
 * @param {FastifyRequest} request - The incoming request.
 * @param {FastifyReply} reply - The reply interface.
 * @returns {Promise<void>}
 */
fastify.get('/api/balance', async (request, reply) => {
  try {
    // Query sums for each payer with COALESCE to handle null values.
    const { rows } = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN payer = 'Adam' THEN amount::numeric ELSE 0 END), 0) AS adam_paid,
        COALESCE(SUM(CASE WHEN payer = 'Eve' THEN amount::numeric ELSE 0 END), 0) AS eve_paid
      FROM transactions
    `);
    
    // Parse amounts and compute the balance.
    const { adam_paid, eve_paid } = rows[0];
    const balance = parseFloat(adam_paid) - parseFloat(eve_paid);
    let message = '';

    if (balance > 0) {
      // Adam paid more so Eve owes Adam.
      message = `Eve owes Adam $${balance.toFixed(2)}`;
    } else if (balance < 0) {
      // Eve paid more so Adam owes Eve.
      message = `Adam owes Eve $${Math.abs(balance).toFixed(2)}`;
    } else {
      message = 'All settled up!';
    }

    // Return the message as HTML so that htmx can update the UI.
    reply.type('text/html').send(message);
  } catch (err) {
    console.error('Error calculating balance:', err);
    reply.status(500).send('Error calculating balance');
  }
});


fastify.post('/api/add-expense', async (request, reply) => {
  const { description, amount, payer } = request.body;

  if (!description || !amount || !payer) {
    return reply.status(400).send('Missing required fields');
  }

  try {
    const insertQuery = `
      INSERT INTO transactions (description, amount, payer, date)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    await pool.query(insertQuery, [description, amount, payer]);

    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    let html = '<ul>';
    for (const expense of rows) {
      html += `<li>${expense.description} - ${expense.amount} - ${expense.payer}</li>`;
    }
    html += '</ul>';

    // Return the HTML fragment
    reply.type('text/html').send(html);
  } catch (err) {
    console.error('Error adding expense:', err);
    reply.status(500).send('Error adding expense');
  }
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


