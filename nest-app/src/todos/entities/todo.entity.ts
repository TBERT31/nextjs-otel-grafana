export class Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: Date;

  constructor(partial: Partial<Todo>) {
    Object.assign(this, partial);
  }
}