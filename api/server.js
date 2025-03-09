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

import todoRoutes from './todoRoutes.js';

dotenv.config();

// Set up the PostgreSQL pool.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("Database connection error:", err));

// Create the Fastify instance.
const fastify = Fastify({
  logger: {
    level: 'warn' // only log warnings and errors
  }
});

// Register plugins.
fastify.register(formbody);
fastify.register(todoRoutes);

// Resolve __dirname and __filename for ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the public directory.
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
});









/**
 * GET /api/expenses
 *
 * Retrieves expense transactions for the current month, calculates last month's balance,
 * and returns an HTML fragment that displays everything with proper formatting.
 */
fastify.get('/api/expenses', async (request, reply) => {
  try {
    // Get current month's transactions
    const currentMonthResult = await pool.query(`
      SELECT * FROM transactions 
      WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
      ORDER BY date DESC
    `);
    
    // Calculate last month's balance
    const lastMonthResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN payer = 'Adam' THEN amount::numeric ELSE 0 END), 0) AS adam_paid,
        COALESCE(SUM(CASE WHEN payer = 'Eve' THEN amount::numeric ELSE 0 END), 0) AS eve_paid
      FROM transactions
      WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    `);
    
    const lastMonthAdamPaid = parseFloat(lastMonthResult.rows[0].adam_paid);
    const lastMonthEvePaid = parseFloat(lastMonthResult.rows[0].eve_paid);
    const lastMonthTotal = lastMonthAdamPaid + lastMonthEvePaid;
    const lastMonthIdealShare = lastMonthTotal / 2;
    
    // Calculate current month balance for the end of each payer's section
    const currentMonthResult2 = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN payer = 'Adam' THEN amount::numeric ELSE 0 END), 0) AS adam_paid,
        COALESCE(SUM(CASE WHEN payer = 'Eve' THEN amount::numeric ELSE 0 END), 0) AS eve_paid
      FROM transactions
      WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
    `);
    
    const currentMonthAdamPaid = parseFloat(currentMonthResult2.rows[0].adam_paid);
    const currentMonthEvePaid = parseFloat(currentMonthResult2.rows[0].eve_paid);
    const currentMonthTotal = currentMonthAdamPaid + currentMonthEvePaid;
    const currentMonthIdealShare = currentMonthTotal / 2;
    
    const html = generateExpenseHtml(
      currentMonthResult.rows, 
      lastMonthAdamPaid, 
      lastMonthEvePaid, 
      lastMonthIdealShare,
      currentMonthAdamPaid,
      currentMonthEvePaid,
      currentMonthIdealShare
    );
    
    reply.type('text/html').send(html);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    reply.status(500).send('Error fetching expenses');
  }
});

/**
 * Generates HTML for displaying expense transactions with balance info.
 * @param {Array} rows - The list of current month's expense transactions.
 * @param {number} lastMonthAdamPaid - Amount paid by Adam last month.
 * @param {number} lastMonthEvePaid - Amount paid by Eve last month.
 * @param {number} lastMonthIdealShare - Ideal share each person should have paid last month.
 * @param {number} currentMonthAdamPaid - Amount paid by Adam this month.
 * @param {number} currentMonthEvePaid - Amount paid by Eve this month.
 * @param {number} currentMonthIdealShare - Ideal share each person should pay this month.
 * @returns {string} The HTML fragment representing expenses with balance info.
 */
function generateExpenseHtml(
  rows, 
  lastMonthAdamPaid, 
  lastMonthEvePaid, 
  lastMonthIdealShare,
  currentMonthAdamPaid,
  currentMonthEvePaid,
  currentMonthIdealShare
) {
  const groupedExpenses = rows.reduce((acc, expense) => {
    const payer = expense.payer;
    if (!acc[payer]) acc[payer] = [];
    acc[payer].push(expense);
    return acc;
  }, {});

  // Get the current month and year for display
  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
  
  // Get last month and year for display
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthYear = lastMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  
  // Calculate current month's balance message
  let currentMonthBalanceMessage = lastMonthYear;
  
  if (currentMonthAdamPaid > currentMonthIdealShare) {
    const diff = currentMonthAdamPaid - currentMonthIdealShare;
    currentMonthBalanceMessage += `: Eve still owes Adam <strong>$${diff.toFixed(2)}</strong>`;
  } else if (currentMonthAdamPaid < currentMonthIdealShare) {
    const diff = currentMonthIdealShare - currentMonthAdamPaid;
    currentMonthBalanceMessage += `: Adam still owes Eve <strong>$${diff.toFixed(2)}</strong>`;
  } else {
    currentMonthBalanceMessage += ': All settled up!';
  }

  // Start with last month's balance
  let html = '';
  
  // If no transactions for current month
  if (Object.keys(groupedExpenses).length === 0) {
    html += '<p class="text-gray-500 italic">No transactions for the current month.</p>';
    return html;
  }

  for (const payer in groupedExpenses) {
    const expenses = groupedExpenses[payer];
    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    html += `<div class='flex-1'><h2 class="text-xl font-bold mt-4">${payer}</h2>`;
    html += '<ul>';
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const formattedDate = expenseDate.toLocaleDateString('en-US', {
        timeZone: 'EST',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      html += `<li id="expense-${expense.id}" class="border-t m-4 py-4">
        <div class="text-lg">${expense.description} <strong class="float-right">$${expense.amount}</strong></div>
        <em class="text-gray-400">${formattedDate}</em>
        <button class="ml-2 text-red-500 delete float-right"
          hx-confirm="Delete ${expense.description}?"
          hx-delete="/api/delete-expense?id=${expense.id}"
          hx-target="closest li"
          hx-swap="delete">
          x
        </button>
      </li>`;
    });
    html += '</ul>';
    html += '<hr/>';
    html += `<p class="mt-2 mb-24 font-semibold">Total for ${payer}: $${total.toFixed(2)}</p></div>`;
  }
  
  // Add current month's balance at the end
  html += `
    <div class="mt-6  border-t-2 border-gray-300 w-full">
      <em>${currentMonthBalanceMessage}</em>
    </div>
  `;
  
  return html;
}






/**
 * GET /api/balance
 *
 * Calculates the net balance between Adam and Eve based on splitting total expenses in half.
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
    let message = '<div class="text-red-500">';

    if (adamPaid > idealShare) {
      const diff = adamPaid - idealShare;
      message += `Eve owes Adam <strong>$${diff.toFixed(2)}</strong>`;
    } else if (adamPaid < idealShare) {
      const diff = idealShare - adamPaid;
      message += `Adam owes Eve <strong>$${diff.toFixed(2)}</strong>`;
    } else {
      message = 'All settled up!';
    }
    message += '</div>';

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
    const html = generateExpenseHtml(rows);
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

// 404 Handler: Send index.html if URL does not appear to be an asset.
fastify.setNotFoundHandler((request, reply) => {
  if (request.raw.url.includes('.')) {
    reply.status(404).send('Not Found');
  } else {
    reply.sendFile('index.html');
  }
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