import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEmailConfirmationCode', async: false })
export class IsEmailConfirmationCodeValidator
  implements ValidatorConstraintInterface
{
  validate(value: string) {
    if (value.length !== 6) {
      return false;
    }
    const allowedChars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const allowedCharsSet = new Set(allowedChars);
    for (const char of value) {
      if (!allowedCharsSet.has(char)) {
        return false;
      }
    }
    return true;
  }
}
