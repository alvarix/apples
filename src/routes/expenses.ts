import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Decimal from 'decimal.js';
import { getMonthTransactions, insertTransaction, deleteTransaction } from '../db/transactions.js';
import { processTransactions, calculateBalance } from '../services/calculations.js';
import type { NewTransaction } from '../types/Transaction';
import { isValidPayer } from '../types/Payer';
import { isValidTransactionType } from '../types/Transaction';

interface AddExpenseBody {
  description: string;
  amount: string;
  payer: string;
  type?: string;
}

interface DeleteExpenseParams {
  id: string;
}

function generateExpenseHtml(transactions: any[], adamPaid: Decimal, evePaid: Decimal, balanceOwes: any): string {
  const groupedExpenses = transactions.reduce((acc: any, expense) => {
    const payer = expense.payer;
    if (!acc[payer]) acc[payer] = [];
    acc[payer].push(expense);
    return acc;
  }, {});

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let balanceMessage = monthYear;
  if (balanceOwes) {
    balanceMessage += `: ${balanceOwes.who} owes ${balanceOwes.whom} <strong>$${balanceOwes.amount}</strong>`;
  } else {
    balanceMessage += ': All settled up!';
  }

  if (Object.keys(groupedExpenses).length === 0) {
    return '<p class="text-gray-500 italic">No transactions for the current month.</p>';
  }

  let html = '';
  for (const payer in groupedExpenses) {
    const expenses = groupedExpenses[payer];
    const total = expenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
    html += `<div class='flex-1'><h2 class="text-xl font-bold mt-4">${payer}</h2>`;
    html += '<ul>';
    expenses.forEach((expense: any) => {
      const expenseDate = new Date(expense.date);
      const formattedDate = expenseDate.toLocaleDateString('en-US', {
        timeZone: 'EST',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const typeLabel = expense.type === 'settlement' ? '<span class="text-green-600">⇄ Settlement</span>' : '';
      html += `<li id="expense-${expense.id}" class="border-t m-4 py-4">
        <div class="text-lg">${typeLabel} ${expense.description} <strong class="float-right">$${expense.amount}</strong></div>
        <em class="text-gray-400">${formattedDate}</em>
        <button class="ml-2 text-red-500 delete float-right"
          hx-confirm="Delete ${expense.description}?"
          hx-delete="/api/delete-expense/${expense.id}"
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

  html += `
    <div class="mt-6 border-t-2 border-gray-300 w-full">
      <em>${balanceMessage}</em>
    </div>
  `;

  return html;
}

export default async function expensesRoutes(app: FastifyInstance) {
  // GET current month expenses
  app.get('/expenses', async (request: FastifyRequest, reply: FastifyReply) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const transactions = await getMonthTransactions(year, month);
    const { adamPaid, evePaid } = processTransactions(transactions);
    const balance = calculateBalance(adamPaid, evePaid);

    const html = generateExpenseHtml(
      transactions,
      adamPaid,
      evePaid,
      balance.owes ? {
        who: balance.owes.who,
        whom: balance.owes.whom,
        amount: balance.owes.amount.toFixed(2)
      } : null
    );

    reply.type('text/html');
    return html;
  });

  // POST add expense
  app.post('/add-expense', async (request: FastifyRequest<{ Body: AddExpenseBody }>, reply: FastifyReply) => {
    const { description, amount, payer, type = 'expense' } = request.body;

    if (!description || !amount || !payer) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    if (!isValidPayer(payer)) {
      return reply.code(400).send({ error: 'Invalid payer' });
    }

    if (!isValidTransactionType(type)) {
      return reply.code(400).send({ error: 'Invalid transaction type' });
    }

    // Validate amount is a valid decimal
    try {
      const amountDecimal = new Decimal(amount);
      if (amountDecimal.lessThanOrEqualTo(0)) {
        return reply.code(400).send({ error: 'Amount must be positive' });
      }
    } catch (err) {
      return reply.code(400).send({ error: 'Invalid amount format' });
    }

    const newTransaction: NewTransaction = {
      description,
      amount,
      payer: payer as any,
      type: type as any
    };

    await insertTransaction(newTransaction);

    // Return updated list as HTML
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const transactions = await getMonthTransactions(year, month);
    const { adamPaid, evePaid } = processTransactions(transactions);
    const balance = calculateBalance(adamPaid, evePaid);

    const html = generateExpenseHtml(
      transactions,
      adamPaid,
      evePaid,
      balance.owes ? {
        who: balance.owes.who,
        whom: balance.owes.whom,
        amount: balance.owes.amount.toFixed(2)
      } : null
    );

    reply.type('text/html');
    return html;
  });

  // DELETE expense
  app.delete('/delete-expense/:id', async (request: FastifyRequest<{ Params: DeleteExpenseParams }>, reply: FastifyReply) => {
    const id = parseInt(request.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: 'Invalid ID' });
    }

    await deleteTransaction(id);

    return { success: true };
  });

  // GET all-time balance
  app.get('/balance', async (request: FastifyRequest, reply: FastifyReply) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const transactions = await getMonthTransactions(year, month);
    const { adamPaid, evePaid } = processTransactions(transactions);
    const balance = calculateBalance(adamPaid, evePaid);

    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let html = monthYear;

    if (balance.owes) {
      html += `: ${balance.owes.who} owes ${balance.owes.whom} <strong>$${balance.owes.amount.toFixed(2)}</strong>`;
    } else {
      html += ': All settled up!';
    }

    reply.type('text/html');
    return html;
  });
}
