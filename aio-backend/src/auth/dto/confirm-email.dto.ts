import { IsNotEmpty, IsString } from 'class-validator';
import { IsEmailConfirmationCode } from '../decorators/is-email-confirmation-code.decorator';

export class ConfirmEmailDto {
  @IsString()
  @IsNotEmpty()
  @IsEmailConfirmationCode()
  code: string;
}
