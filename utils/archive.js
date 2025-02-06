import { pool } from '../db-connection.js';

/**
 * Archives transactions from previous months.
 * Moves records with dates older than the first day of the current month into the archive table.
 *
 * @returns {Promise<void>}
 */
export async function archiveOldTransactions() {
  const now = new Date();
  const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const cutoffDateISO = firstDayCurrentMonth.toISOString();

  const { rows } = await pool.query('SELECT COUNT(*) FROM transactions WHERE date < $1', [cutoffDateISO]);
  if (parseInt(rows[0].count, 10) > 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO archived_transactions (id, description, amount, payer, date)
        SELECT id, description, amount, payer, date
        FROM transactions
        WHERE date < $1
      `, [cutoffDateISO]);
      await client.query('DELETE FROM transactions WHERE date < $1', [cutoffDateISO]);
      await client.query('COMMIT');
      console.log('Archived transactions older than', cutoffDateISO);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error archiving transactions:', err);
    } finally {
      client.release();
    }
  }
}