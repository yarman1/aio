import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsStripeProductIdValidator } from '../validators/id-stripe-product-id.validator';

export function IsStripeProductId(validationOptions?: ValidationOptions) {
  return function (object: NonNullable<unknown>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStripeProductIdValidator,
    });
  };
}
