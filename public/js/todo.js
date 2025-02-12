/**
 * Provides reactive data and methods for the persistent todo app.
 * This Alpine.js component is now defined in a separate file.
 * @returns {Object} The Alpine.js todo component.
 */
function todoApp() {
    return {
      todos: [],
      newTodo: '',
      /**
       * Fetches the todos from the backend.
       */
      async fetchTodos() {
        try {
          const res = await fetch('/api/todos');
          this.todos = await res.json();
        } catch (err) {
          console.error('Error fetching todos:', err);
        }
      },
      /**
       * Adds a new todo item via the API.
       */
      async addTodo() {
        if (this.newTodo.trim() === '') return;
        try {
          const res = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: this.newTodo.trim() })
          });
          if (res.ok) {
            const newItem = await res.json();
            this.todos.push(newItem);
            this.newTodo = '';
          } else {
            console.error('Error adding todo');
          }
        } catch (err) {
          console.error('Error adding todo:', err);
        }
      },
      /**
       * Toggles the done status of a todo item.
       * @param {number} index - The index of the todo to toggle.
       */
      async toggleTodo(index) {
        const todo = this.todos[index];
        try {
          const res = await fetch(`/api/todos/${todo.id}`, {
            method: 'PATCH'
          });
          if (res.ok) {
            const updatedTodo = await res.json();
            this.todos.splice(index, 1, updatedTodo);
          } else {
            console.error('Error updating todo');
          }
        } catch (err) {
          console.error('Error updating todo:', err);
        }
      },
      /**
       * Removes a todo item after confirmation.
       * @param {number} index - The index of the todo to remove.
       */
      async removeTodo(index) {
        const todo = this.todos[index];
        if (!confirm('Are you sure you want to delete this todo?')) return;
        try {
          const res = await fetch(`/api/todos/${todo.id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            this.todos.splice(index, 1);
          } else {
            console.error('Error deleting todo');
          }
        } catch (err) {
          console.error('Error deleting todo:', err);
        }
      }
    }
  }
  
  // Expose the component function globally so it can be used in index.html
  window.todoApp = todoApp;