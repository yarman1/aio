import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsIntervalValidator } from '../validators/is-interval.validator';

export function IsInterval(validationOptions?: ValidationOptions) {
  return function (object: NonNullable<unknown>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIntervalValidator,
    });
  };
}
