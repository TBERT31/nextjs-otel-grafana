import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateTodoDto {
  @IsNotEmpty()
  @IsBoolean()
  completed: boolean;
}