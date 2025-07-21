// lib/database.ts - PostgreSQL database connection for Next.js
import { Pool } from 'pg';
import { logger } from './logger';

// Interface pour un Todo
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: Date;
}

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'tododb',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Log des événements de connexion
    this.pool.on('connect', () => {
      logger.info('New PostgreSQL connection established');
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL error on idle client', err);
    });

    logger.info('PostgreSQL pool initialized', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'tododb',
    });
  }

  // Singleton pattern
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Méthodes pour les Todos
  async getAllTodos(): Promise<Todo[]> {
    try {
      logger.info('Fetching all todos');
      const result = await this.pool.query(
        'SELECT id, title, completed, created_at FROM todos ORDER BY id'
      );
      logger.info(`Retrieved ${result.rows.length} todos`);
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch todos', error as Error);
      throw error;
    }
  }

  async createTodo(title: string, completed: boolean = false): Promise<Todo> {
    try {
      logger.info(`Creating new todo: ${title}`);
      const result = await this.pool.query(
        'INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING id, title, completed, created_at',
        [title, completed]
      );
      const todo = result.rows[0];
      logger.info(`Created todo with ID: ${todo.id}`);
      return todo;
    } catch (error) {
      logger.error('Failed to create todo', error as Error, { title, completed });
      throw error;
    }
  }

  async updateTodo(id: number, completed: boolean): Promise<Todo | null> {
    try {
      logger.info(`Updating todo ID: ${id}`, { completed });
      const result = await this.pool.query(
        'UPDATE todos SET completed = $1 WHERE id = $2 RETURNING id, title, completed, created_at',
        [completed, id]
      );

      if (result.rowCount === 0) {
        logger.warn(`Todo not found with ID: ${id}`);
        return null;
      }

      const todo = result.rows[0];
      logger.info(`Updated todo ID: ${id}`);
      return todo;
    } catch (error) {
      logger.error(`Failed to update todo with ID: ${id}`, error as Error, { id, completed });
      throw error;
    }
  }

  async deleteTodo(id: number): Promise<boolean> {
    try {
      logger.info(`Deleting todo ID: ${id}`);
      const result = await this.pool.query('DELETE FROM todos WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        logger.warn(`Todo not found with ID: ${id}`);
        return false;
      }

      logger.info(`Deleted todo ID: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete todo with ID: ${id}`, error as Error, { id });
      throw error;
    }
  }

  // Méthode pour tester la connexion
  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT NOW()');
      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error('Database connection test failed', error as Error);
      return false;
    }
  }

  // Fermeture propre de la connexion
  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database pool closed');
    } catch (error) {
      logger.error('Error closing database pool', error as Error);
    }
  }
}

// Export de l'instance singleton
export const db = Database.getInstance();