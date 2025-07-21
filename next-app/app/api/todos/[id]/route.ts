import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/todos/[id] - Mettre à jour un todo
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    
    // Validation de l'ID
    if (isNaN(id) || id <= 0) {
      logger.warn('PUT /api/todos/[id] - Invalid ID provided', { id: params.id });
      return NextResponse.json(
        { error: 'Invalid todo ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { completed } = body;

    logger.info(`PUT /api/todos/${id} - Updating todo`, { id, completed });

    // Validation du champ completed
    if (typeof completed !== 'boolean') {
      logger.warn('PUT /api/todos/[id] - Invalid completed value', { completed });
      return NextResponse.json(
        { error: 'Completed must be a boolean' },
        { status: 400 }
      );
    }

    const updatedTodo = await db.updateTodo(id, completed);

    if (!updatedTodo) {
      logger.warn(`PUT /api/todos/${id} - Todo not found`, { id });
      return NextResponse.json(
        { error: `Todo with ID ${id} not found` },
        { status: 404 }
      );
    }

    logger.info(`PUT /api/todos/${id} - Todo updated successfully`, { 
      todoId: updatedTodo.id,
      completed: updatedTodo.completed 
    });

    return NextResponse.json(updatedTodo, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    logger.error(`PUT /api/todos/${params.id} - Failed to update todo`, error as Error);
    
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

// DELETE /api/todos/[id] - Supprimer un todo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    
    // Validation de l'ID
    if (isNaN(id) || id <= 0) {
      logger.warn('DELETE /api/todos/[id] - Invalid ID provided', { id: params.id });
      return NextResponse.json(
        { error: 'Invalid todo ID' },
        { status: 400 }
      );
    }

    logger.info(`DELETE /api/todos/${id} - Deleting todo`, { id });

    const deleted = await db.deleteTodo(id);

    if (!deleted) {
      logger.warn(`DELETE /api/todos/${id} - Todo not found`, { id });
      return NextResponse.json(
        { error: `Todo with ID ${id} not found` },
        { status: 404 }
      );
    }

    logger.info(`DELETE /api/todos/${id} - Todo deleted successfully`, { id });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(`DELETE /api/todos/${params.id} - Failed to delete todo`, error as Error);
    
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}