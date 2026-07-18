import { IsIn } from 'class-validator';

export class ChangeRoleDto {
  @IsIn(['admin', 'client', 'livreur'])
  role: string;
}
