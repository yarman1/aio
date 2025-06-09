export class CreateUserDto {
  email: string;
  userName: string;
  passwordHash: string;
  customerId: string;
  isEmailConfirmed?: boolean;
}
