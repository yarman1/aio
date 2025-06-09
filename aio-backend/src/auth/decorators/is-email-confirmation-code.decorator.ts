import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsEmailConfirmationCodeValidator } from '../validators/is-email-confirmation-code.validator';

export function IsEmailConfirmationCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmailConfirmationCodeValidator,
    });
  };
}
