/**
 * server.js
 *
 * A Fastify server that connects to a PostgreSQL database to manage expense transactions.
 * It provides endpoints to:
 *  - List expenses grouped by payer with totals and delete buttons.
 *  - Calculate the balance between Adam and Eve.
 *  - Add new expenses.
 *  - Delete an expense.
 * It also serves static files from the public directory.
 * When run locally (outside of Vercel), it listens on port 3000.
 */

import Fastify from 'fastify';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';
import formbody from '@fastify/formbody';

dotenv.config();

// Set up the PostgreSQL pool.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("Database connection error:", err));

// Create the Fastify instance.
const fastify = Fastify({
  logger: {
    level: 'warn' // only log warnings and errors (suppress info logs)
  }
});

// Register the formbody plugin.
fastify.register(formbody);

// Resolve __dirname and __filename for ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register static file serving for files in the public directory.
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
});








/**
 * GET /api/expenses
 *
 * Retrieves all expense transactions, groups them by payer,
 * and returns an HTML fragment that displays each group with a delete button for each expense.
 */
fastify.get('/api/expenses', async (request, reply) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    const groupedExpenses = rows.reduce((acc, expense) => {
      const payer = expense.payer;
      if (!acc[payer]) acc[payer] = [];
      acc[payer].push(expense);
      return acc;
    }, {});

    let html = '';
    for (const payer in groupedExpenses) {
      const expenses = groupedExpenses[payer];
      const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      html += `<h2 class="text-xl font-bold mt-4">${payer}</h2>`;
      html += '<ul class="list-disc ml-6">';
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const formattedDate = expenseDate.toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }) + ' ' + expenseDate.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit'
        });
        html += `<li id="expense-${expense.id}">${expense.description} - $${expense.amount} - ${formattedDate}
        <button class="ml-2 text-red-500 delete"
          hx-confirm="Delete ${expense.description}?"
          hx-delete="/api/delete-expense?id=${expense.id}"
          hx-target="closest li"
          hx-swap="delete">
          x
        </button>
      </li>`;
      });
      html += '</ul>';
      html += `<p class="mt-2 font-semibold">Total for ${payer}: $${total.toFixed(2)}</p>`;
    }
    reply.type('text/html').send(html);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    reply.status(500).send('Error fetching expenses');
  }
});












/**
 * GET /api/balance
 *
 * Calculates the net balance between Adam and Eve based on splitting total expenses in half.
 * Each person should pay half of the total expense. If Adam overpaid, then Eve owes him the difference,
 * and vice versa.
 *
 * @param {FastifyRequest} request - The incoming request.
 * @param {FastifyReply} reply - The reply interface.
 * @returns {Promise<void>}
 */
fastify.get('/api/balance', async (request, reply) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN payer = 'Adam' THEN amount::numeric ELSE 0 END), 0) AS adam_paid,
        COALESCE(SUM(CASE WHEN payer = 'Eve' THEN amount::numeric ELSE 0 END), 0) AS eve_paid
      FROM transactions
    `);

    const adamPaid = parseFloat(rows[0].adam_paid);
    const evePaid = parseFloat(rows[0].eve_paid);
    const total = adamPaid + evePaid;
    const idealShare = total / 2;
    let message = '';

    if (adamPaid > idealShare) {
      // Adam overpaid; Eve owes the difference.
      const diff = adamPaid - idealShare;
      message = `Eve owes Adam $${diff.toFixed(2)}`;
    } else if (adamPaid < idealShare) {
      // Adam underpaid; Adam owes the difference.
      const diff = idealShare - adamPaid;
      message = `Adam owes Eve $${diff.toFixed(2)}`;
    } else {
      message = 'All settled up!';
    }

    reply.type('text/html').send(message);
  } catch (err) {
    console.error('Error calculating balance:', err);
    reply.status(500).send('Error calculating balance');
  }
});











/**
 * POST /api/add-expense
 *
 * Adds a new expense transaction and returns an updated HTML fragment of expenses.
 * If multiple checkboxes are used for payer, only the first value is taken.
 */
fastify.post('/api/add-expense', async (request, reply) => {
  const { description, amount } = request.body;
  let payer = request.body.payer;
  if (Array.isArray(payer)) {
    payer = payer[0];
  }
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
    // Retrieve updated expenses list.
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    const groupedExpenses = rows.reduce((acc, expense) => {
      const payer = expense.payer;
      if (!acc[payer]) acc[payer] = [];
      acc[payer].push(expense);
      return acc;
    }, {});
    let html = '';
    for (const payer in groupedExpenses) {
      const expenses = groupedExpenses[payer];
      const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      html += `<h2 class="text-xl font-bold mt-4">${payer}</h2>`;
      html += '<ul class="list-disc ml-6">';
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const formattedDate = expenseDate.toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }) + ' ' + expenseDate.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit'
        });
        html += `<li id="expense-${expense.id}">${expense.description} - $${expense.amount} - ${formattedDate}
        <button class="delete ml-2 text-red-500"
          hx-confirm="Delete ${expense.description}?"
          hx-delete="/api/delete-expense?id=${expense.id}"
          hx-target="closest li"
          hx-swap="delete">
          x
        </button>
      </li>`;
      });
      html += '</ul>';
      html += `<p class="mt-2 font-semibold">Total for ${payer}: $${total.toFixed(2)}</p>`;
    }
    reply.type('text/html').send(html);
  } catch (err) {
    console.error('Error adding expense:', err);
    reply.status(500).send('Error adding expense');
  }
});








/**
 * DELETE /api/delete-expense
 *
 * Deletes an expense given its id (provided as a query parameter) and returns an empty response.
 */
fastify.delete('/api/delete-expense', async (request, reply) => {
  try {
    const id = request.query.id;
    if (!id) {
      return reply.status(400).send('Missing expense id');
    }
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    // Return 200 OK with an empty body so HTMX can remove the DOM element.
    reply.status(200).send('');
  } catch (err) {
    console.error('Error deleting expense:', err);
    reply.status(500).send('Error deleting expense');
  }
});
















/**
 * GET /
 *
 * Serves the index.html file from the public directory.
 */
fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

/**
 * 404 Handler
 *
 * Serves index.html for unmatched routes (supporting a single-page application).
 */
fastify.setNotFoundHandler((request, reply) => {
  return reply.sendFile('index.html');
});

/**
 * Export the Fastify server as a serverless function for Vercel.
 */
export default async (req, res) => {
  try {
    await fastify.ready();
    fastify.server.emit('request', req, res);
  } catch (err) {
    console.error('Error during request handling:', err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
};

// Start the server locally if not running in Vercel.
if (process.env.VERCEL_ENV === undefined) {
  fastify.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening on ${address}`);
  });
}



/**
 * GET /api/todos
 *
 * Retrieves all todo items from the database.
 */
fastify.get('/api/todos', async (request, reply) => {
  try {
    const { rows } = await pool.query('SELECT * FROM todos ORDER BY id ASC');
    reply.send(rows);
  } catch (err) {
    console.error('Error fetching todos:', err);
    reply.status(500).send('Error fetching todos');
  }
});

/**
 * POST /api/todos
 *
 * Adds a new todo item to the database.
 */
fastify.post('/api/todos', async (request, reply) => {
  const { text } = request.body;
  if (!text) return reply.status(400).send('Missing todo text');
  try {
    const { rows } = await pool.query(
      'INSERT INTO todos (text, done) VALUES ($1, $2) RETURNING *',
      [text, false]
    );
    reply.send(rows[0]);
  } catch (err) {
    console.error('Error adding todo:', err);
    reply.status(500).send('Error adding todo');
  }
});

/**
 * PATCH /api/todos/:id
 *
 * Toggles the completion status of a todo item.
 */
fastify.patch('/api/todos/:id', async (request, reply) => {
  const { id } = request.params;
  try {
    // Retrieve the current status of the todo.
    const { rows } = await pool.query('SELECT done FROM todos WHERE id = $1', [id]);
    if (rows.length === 0) return reply.status(404).send('Todo not found');
    const currentDone = rows[0].done;
    // Update the todo with the toggled status.
    const { rows: updatedRows } = await pool.query(
      'UPDATE todos SET done = $1 WHERE id = $2 RETURNING *',
      [!currentDone, id]
    );
    reply.send(updatedRows[0]);
  } catch (err) {
    console.error('Error updating todo:', err);
    reply.status(500).send('Error updating todo');
  }
});

/**
 * DELETE /api/todos/:id
 *
 * Deletes a todo item from the database.
 */
fastify.delete('/api/todos/:id', async (request, reply) => {
  const { id } = request.params;
  try {
    await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    reply.status(200).send('');
  } catch (err) {
    console.error('Error deleting todo:', err);
    reply.status(500).send('Error deleting todo');
  }
});