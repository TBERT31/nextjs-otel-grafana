import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class AppService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'tododb',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  }

  getHello(): string {
    return 'Hello World!';
  }

  async testDatabaseConnection(): Promise<boolean> {
    try {
      // Test simple de connexion avec une requête basique
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // Méthode pour fermer proprement le pool de connexions
  async onModuleDestroy() {
    await this.pool.end();
  }
}