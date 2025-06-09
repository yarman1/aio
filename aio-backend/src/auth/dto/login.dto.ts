import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email must be in the correct format' })
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
