import { pool, query } from '../db/connection.js';
import { insertTransaction } from '../db/transactions.js';
import { processTransactions, calculateBalance } from '../services/calculations.js';
import type { NewTransaction, TransactionType } from '../types/Transaction';
import type { Payer } from '../types/Payer';

interface TransactionTemplate {
  category: string;
  descriptions: string[];
  minAmount: number;
  maxAmount: number;
  weight: number;
}

interface SeedConfig {
  count: number;
  startDate: Date;
  endDate: Date;
  clear: boolean;
}

const TRANSACTION_TEMPLATES: TransactionTemplate[] = [
  {
    category: 'Groceries',
    descriptions: ['Whole Foods', 'Trader Joe\'s', 'Safeway', 'Farmer\'s Market', 'Grocery shopping'],
    minAmount: 40,
    maxAmount: 150,
    weight: 30
  },
  {
    category: 'Dining',
    descriptions: ['Dinner at restaurant', 'Lunch', 'Coffee shop', 'Takeout', 'Brunch'],
    minAmount: 15,
    maxAmount: 80,
    weight: 25
  },
  {
    category: 'Utilities',
    descriptions: ['Electric Bill', 'Internet', 'Water Bill', 'Gas Bill'],
    minAmount: 50,
    maxAmount: 200,
    weight: 10
  },
  {
    category: 'Transportation',
    descriptions: ['Gas', 'Uber', 'Lyft', 'Parking', 'Car wash'],
    minAmount: 20,
    maxAmount: 100,
    weight: 10
  },
  {
    category: 'Entertainment',
    descriptions: ['Movies', 'Concert tickets', 'Museum', 'Streaming services', 'Books'],
    minAmount: 10,
    maxAmount: 150,
    weight: 10
  },
  {
    category: 'Shopping',
    descriptions: ['Clothing', 'Amazon order', 'Target', 'Household items', 'Pharmacy'],
    minAmount: 25,
    maxAmount: 300,
    weight: 10
  }
];

function parseArgs(): SeedConfig {
  const args = process.argv.slice(2);
  const config: SeedConfig = {
    count: 100,
    startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
    endDate: new Date(),
    clear: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':
        config.count = parseInt(args[++i]);
        break;
      case '--start-date':
        config.startDate = new Date(args[++i]);
        break;
      case '--end-date':
        config.endDate = new Date(args[++i]);
        break;
      case '--clear':
        config.clear = true;
        break;
    }
  }

  return config;
}

function selectRandomPayer(): Payer {
  return Math.random() < 0.5 ? 'Adam' : 'Eve';
}

function selectRandomCategory(): TransactionTemplate {
  const totalWeight = TRANSACTION_TEMPLATES.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;

  for (const template of TRANSACTION_TEMPLATES) {
    random -= template.weight;
    if (random <= 0) {
      return template;
    }
  }

  return TRANSACTION_TEMPLATES[0];
}

function generateRandomAmount(min: number, max: number): string {
  const amount = min + Math.random() * (max - min);
  return amount.toFixed(2);
}

function generateRandomDate(start: Date, end: Date): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();

  // Weight more recent dates higher
  const random = Math.pow(Math.random(), 0.5); // Square root gives more weight to recent
  const timeMs = startMs + random * (endMs - startMs);

  return new Date(timeMs);
}

function generateTransaction(date: Date, settlementRate: number = 0.05): NewTransaction {
  const isSettlement = Math.random() < settlementRate;

  if (isSettlement) {
    const payer = selectRandomPayer();
    const whom = payer === 'Adam' ? 'Eve' : 'Adam';
    return {
      description: `${payer} pays ${whom} back`,
      amount: generateRandomAmount(20, 200),
      payer,
      type: 'settlement',
      date
    };
  }

  const category = selectRandomCategory();
  const randomDescription = category.descriptions[Math.floor(Math.random() * category.descriptions.length)];

  return {
    description: randomDescription,
    amount: generateRandomAmount(category.minAmount, category.maxAmount),
    payer: selectRandomPayer(),
    type: 'expense',
    date
  };
}

async function clearTransactions(): Promise<void> {
  console.log('\n⚠️  WARNING: This will delete ALL transactions!');
  console.log('Press Ctrl+C now to cancel, or wait 3 seconds to proceed...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  await query('DELETE FROM transactions');
  console.log('✓ All transactions cleared\n');
}

async function seed(config: SeedConfig): Promise<void> {
  console.log('🌱 Seeding database with test data...\n');
  console.log('Configuration:');
  console.log(`- Count: ${config.count} transactions`);
  console.log(`- Date range: ${config.startDate.toISOString().split('T')[0]} to ${config.endDate.toISOString().split('T')[0]}`);
  console.log(`- Clear existing: ${config.clear}\n`);

  if (config.clear) {
    await clearTransactions();
  }

  console.log('Generating transactions...');

  const transactions: NewTransaction[] = [];
  for (let i = 0; i < config.count; i++) {
    const date = generateRandomDate(config.startDate, config.endDate);
    const transaction = generateTransaction(date);
    transactions.push(transaction);
  }

  // Sort by date for better display
  transactions.sort((a, b) => a.date!.getTime() - b.date!.getTime());

  // Insert all transactions
  let expenseCount = { Adam: 0, Eve: 0 };
  let settlementCount = { Adam: 0, Eve: 0 };

  for (const transaction of transactions) {
    await insertTransaction(transaction);
    if (transaction.type === 'expense') {
      expenseCount[transaction.payer]++;
    } else {
      settlementCount[transaction.payer]++;
    }
  }

  console.log(`✓ Created ${config.count} transactions\n`);

  // Calculate final balance
  const allTransactions = await query('SELECT * FROM transactions ORDER BY date');
  const { adamPaid, evePaid } = processTransactions(allTransactions.rows.map(row => ({
    id: row.id,
    description: row.description,
    amount: row.amount,
    payer: row.payer,
    type: row.type,
    date: row.date
  })));
  const balance = calculateBalance(adamPaid, evePaid);

  // Monthly breakdown
  const monthlyBreakdown = await query(`
    SELECT
      DATE_TRUNC('month', date) as month,
      COUNT(*) as count
    FROM transactions
    WHERE date >= $1 AND date <= $2
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month
  `, [config.startDate, config.endDate]);

  console.log('Summary:');
  console.log(`- Expenses: ${expenseCount.Adam + expenseCount.Eve} (Adam: ${expenseCount.Adam}, Eve: ${expenseCount.Eve})`);
  console.log(`- Settlements: ${settlementCount.Adam + settlementCount.Eve} (Adam: ${settlementCount.Adam}, Eve: ${settlementCount.Eve})`);
  console.log(`- Date range: ${config.startDate.toISOString().split('T')[0]} to ${config.endDate.toISOString().split('T')[0]}`);
  console.log(`- Total amount: $${adamPaid.plus(evePaid).toFixed(2)}`);

  if (balance.owes) {
    console.log(`- Final balance: ${balance.owes.who} owes ${balance.owes.whom} $${balance.owes.amount.toFixed(2)}`);
  } else {
    console.log(`- Final balance: All settled up!`);
  }

  console.log('\nMonthly breakdown:');
  for (const row of monthlyBreakdown.rows) {
    const monthDate = new Date(row.month);
    const monthYear = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    console.log(`- ${monthYear}: ${row.count} transactions`);
  }

  console.log('\n✅ Seeding complete!\n');
}

async function main() {
  try {
    const config = parseArgs();
    await seed(config);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
