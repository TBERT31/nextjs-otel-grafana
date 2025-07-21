import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    logger.info('GET /api/todos - Fetching all todos');
    
    const todos = await db.getAllTodos();
    
    return NextResponse.json(todos, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    logger.error('GET /api/todos - Failed to fetch todos', error as Error);
    
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

// POST /api/todos - Créer un nouveau todo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, completed = false } = body;

    logger.info('POST /api/todos - Creating new todo', { title, completed });

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      logger.warn('POST /api/todos - Invalid title provided', { title });
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof completed !== 'boolean') {
      logger.warn('POST /api/todos - Invalid completed value', { completed });
      return NextResponse.json(
        { error: 'Completed must be a boolean' },
        { status: 400 }
      );
    }

    const todo = await db.createTodo(title.trim(), completed);
    
    logger.info('POST /api/todos - Todo created successfully', { 
      todoId: todo.id, 
      title: todo.title 
    });

    return NextResponse.json(todo, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    logger.error('POST /api/todos - Failed to create todo', error as Error);
    
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}