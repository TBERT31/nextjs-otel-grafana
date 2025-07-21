'use client';

import { useState, useEffect } from 'react';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les todos au montage du composant
  useEffect(() => {
    fetchTodos();
  }, []);

  // Fonction pour récupérer tous les todos
  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/todos');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const todosData = await response.json();
      setTodos(todosData);
    } catch (err) {
      console.error('Error fetching todos:', err);
      setError('Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ajouter un nouveau todo
  const addTodo = async () => {
    if (!newTodo.trim()) return;

    try {
      setError(null);
      
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTodo.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTodoData = await response.json();
      setTodos([...todos, newTodoData]);
      setNewTodo('');
    } catch (err) {
      console.error('Error adding todo:', err);
      setError('Failed to add todo');
    }
  };

  // Fonction pour basculer le statut d'un todo
  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedTodo = await response.json();
      setTodos(todos.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
    } catch (err) {
      console.error('Error updating todo:', err);
      setError('Failed to update todo');
    }
  };

  // Fonction pour supprimer un todo
  const deleteTodo = async (id: number) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTodos(todos.filter(todo => todo.id !== id));
    } catch (err) {
      console.error('Error deleting todo:', err);
      setError('Failed to delete todo');
    }
  };

  // Gestion de la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTodo();
  };

  if (loading) {
    return (
      <div className="container">
        <h1>OpenTelemetry Next.js Todo App</h1>
        <div className="loading">Loading todos...</div>
      </div>
    );
  }

  return (
    <>
      <div className="container">
        <h1>OpenTelemetry Next.js Todo App</h1>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-todo">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new todo..."
            className="todo-input"
          />
          <button type="submit" className="add-button">
            Add
          </button>
        </form>

        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={(e) => toggleTodo(todo.id, e.target.checked)}
              />
              <span className="todo-text">{todo.title}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="delete-btn"
                title="Delete todo"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {todos.length === 0 && !loading && (
          <div className="empty-state">
            No todos yet. Add your first todo above!
          </div>
        )}

        <div className="info">
          <p>This Next.js application is instrumented with OpenTelemetry.</p>
          <p>All traces, logs, and metrics are automatically captured and sent to Grafana via the OTEL Collector.</p>
          <p>Total todos: {todos.length} | Completed: {todos.filter(t => t.completed).length}</p>
        </div>

        <div className="links">
          <a href="/api/health" target="_blank" rel="noopener noreferrer">
            Health Check
          </a>
        </div>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        h1 {
          color: #2c3e50;
          text-align: center;
          margin-bottom: 30px;
          font-size: 2.5em;
          font-weight: 300;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 1.2em;
          color: #666;
        }

        .error-message {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-message button {
          background: none;
          border: none;
          color: #c33;
          font-size: 18px;
          cursor: pointer;
          padding: 0 5px;
        }

        .add-todo {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .todo-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .todo-input:focus {
          outline: none;
          border-color: #3498db;
        }

        .add-button {
          padding: 12px 24px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .add-button:hover {
          background-color: #2980b9;
        }

        .todo-list {
          list-style: none;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 30px;
        }

        .todo-item {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;
        }

        .todo-item:last-child {
          border-bottom: none;
        }

        .todo-item:hover {
          background-color: #fafafa;
        }

        .todo-item.completed .todo-text {
          text-decoration: line-through;
          color: #999;
        }

        .todo-item input[type="checkbox"] {
          margin-right: 15px;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .todo-text {
          flex: 1;
          font-size: 16px;
          line-height: 1.4;
        }

        .delete-btn {
          background: none;
          border: none;
          color: #e74c3c;
          font-size: 20px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .delete-btn:hover {
          background-color: #fee;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 1.1em;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }

        .info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #3498db;
          margin-bottom: 20px;
        }

        .info p {
          margin-bottom: 8px;
        }

        .info p:last-child {
          margin-bottom: 0;
          font-weight: 500;
        }

        .links {
          text-align: center;
        }

        .links a {
          display: inline-block;
          padding: 10px 20px;
          background-color: #34495e;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .links a:hover {
          background-color: #2c3e50;
        }

        @media (max-width: 600px) {
          .container {
            padding: 15px;
          }

          h1 {
            font-size: 2em;
            margin-bottom: 20px;
          }

          .add-todo {
            flex-direction: column;
            gap: 15px;
          }

          .todo-item {
            padding: 12px 15px;
          }
        }
      `}</style>
    </>
  );
}