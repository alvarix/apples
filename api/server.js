import Fastify from 'fastify';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';
import { archiveOldTransactions } from '../utils/archive.js'; 



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
/**
 * GET /api/expenses
 *
 * Retrieves all expense transactions from the database, groups them by payer,
 * and returns an HTML fragment with a separate list for each payer including a total at the bottom.
 *
 * @param {FastifyRequest} request - The incoming request.
 * @param {FastifyReply} reply - The reply interface.
 * @returns {Promise<void>} - Sends an HTML fragment containing the grouped expenses list.
 */
fastify.get('/api/expenses', async (request, reply) => {
  try {
    // Retrieve all transactions ordered by date descending.
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');

    // Group transactions by payer.
    const groupedExpenses = rows.reduce((acc, expense) => {
      const payer = expense.payer;
      if (!acc[payer]) {
        acc[payer] = [];
      }
      acc[payer].push(expense);
      return acc;
    }, {});

    // Build HTML for each payer's expense list.
    let html = '';
    for (const payer in groupedExpenses) {
      const expenses = groupedExpenses[payer];
      // Calculate the total amount for this payer.
      const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

      // Header for the payer.
      html += `<h2 class="text-xl font-bold mt-4">${payer}</h2>`;
      html += '<ul class="list-disc ml-6">';
      // Build each expense item with a formatted date.
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const formattedDate = expenseDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) + ' ' + expenseDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        html += `<li>${expense.description} - $${expense.amount} - ${formattedDate}</li>`;
      });
      html += '</ul>';
      // Display total for this payer.
      html += `<p class="mt-2 font-semibold">Total for ${payer}: $${total.toFixed(2)}</p>`;
    }

    // Send the constructed HTML fragment.
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


/**
 * POST /api/add-expense
 *
 * Adds a new expense transaction and triggers archiving if a new month has begun.
 * If checkboxes are used for "payer" and both are checked, the first value is used.
 *
 * @param {FastifyRequest} request - The incoming request containing form data.
 * @param {FastifyReply} reply - The reply interface.
 * @returns {Promise<void>}
 */
fastify.post('/api/add-expense', async (request, reply) => {
  const { description, amount } = request.body;
  let payer = request.body.payer;

  // If "payer" is an array (i.e. both checkboxes are checked), choose the first.
  if (Array.isArray(payer)) {
    payer = payer[0];
  }

  if (!description || !amount || !payer) {
    return reply.status(400).send('Missing required fields');
  }

  try {
    // Insert new expense with current timestamp.
    const insertQuery = `
      INSERT INTO transactions (description, amount, payer, date)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    await pool.query(insertQuery, [description, amount, payer]);

    // Check and archive any transactions from previous months.
    await archiveOldTransactions();
  

    // Retrieve the updated list of expenses.
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    let html = '';
    rows.forEach(expense => {
      html += `<li>${expense.description} - ${expense.amount} - ${expense.payer} - ${new Date(expense.date).toLocaleString()}</li>`;
    });
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


