import { pool } from '../db-connection.js';

/**
 * Registers the todo endpoints.
 * @param {FastifyInstance} fastify - The Fastify instance.
 * @param {Object} options - Plugin options (unused).
 */
export default async function todoRoutes(fastify, options) {
  /**
   * GET /api/todos
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
   * Adds a new todo item.
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
   * Toggles the done status of a todo item.
   */
  fastify.patch('/api/todos/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const { rows } = await pool.query('SELECT done FROM todos WHERE id = $1', [id]);
      if (rows.length === 0) return reply.status(404).send('Todo not found');
      const currentDone = rows[0].done;
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
   * Deletes a todo item.
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
}