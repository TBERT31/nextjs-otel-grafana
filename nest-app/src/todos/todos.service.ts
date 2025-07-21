// src/todos/todos.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../config/database.config';
import { CustomLoggerService } from '../shared/logger/logger.service';
import { CreateTodoDto } from './dtos/create-todo.dto';
import { UpdateTodoDto } from './dtos/update-todo.dto';
import { Todo } from './entities/todo.entity';

@Injectable()
export class TodosService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: CustomLoggerService,
  ) {}

  async findAll(): Promise<Todo[]> {
    try {
      this.logger.info('Getting all todos');
      
      const result = await this.databaseService.query(
        'SELECT id, title, completed, created_at FROM todos ORDER BY id'
      );
      
      this.logger.info(`Retrieved ${result.rows.length} todos`);
      return result.rows.map(row => new Todo(row));
    } catch (error) {
      this.logger.error('Failed to get todos', error);
      throw error;
    }
  }

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    try {
      this.logger.info(`Creating new todo: ${createTodoDto.title}`);
      
      const result = await this.databaseService.query(
        'INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING id, title, completed, created_at',
        [createTodoDto.title, createTodoDto.completed || false]
      );
      
      const todo = new Todo(result.rows[0]);
      this.logger.info(`Created todo with ID: ${todo.id}`);
      
      return todo;
    } catch (error) {
      this.logger.error('Failed to create todo', error);
      throw error;
    }
  }

  async update(id: number, updateTodoDto: UpdateTodoDto): Promise<Todo> {
    try {
      this.logger.info(`Updating todo ID: ${id}`);
      
      const result = await this.databaseService.query(
        'UPDATE todos SET completed = $1 WHERE id = $2 RETURNING *',
        [updateTodoDto.completed, id]
      );

      if (result.rowCount === 0) {
        this.logger.error(`Todo not found with ID: ${id}`);
        throw new NotFoundException(`Todo with ID ${id} not found`);
      }

      const todo = new Todo(result.rows[0]);
      this.logger.info(`Updated todo ID: ${id}`);
      
      return todo;
    } catch (error) {
      this.logger.error(`Failed to update todo with ID: ${id}`, error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      this.logger.info(`Deleting todo ID: ${id}`);
      
      const result = await this.databaseService.query(
        'DELETE FROM todos WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        this.logger.error(`Todo not found with ID: ${id}`);
        throw new NotFoundException(`Todo with ID ${id} not found`);
      }

      this.logger.info(`Deleted todo ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete todo with ID: ${id}`, error);
      throw error;
    }
  }
}