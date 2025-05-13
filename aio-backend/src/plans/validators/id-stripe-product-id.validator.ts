import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsStripeProductId', async: false })
export class IsStripeProductIdValidator
  implements ValidatorConstraintInterface
{
  validate(value: string) {
    const pattern = /^prod_[A-Za-z0-9]{8,}$/;
    return pattern.test(value);
  }

  defaultMessage(validationArguments: ValidationArguments): string {
    return `${validationArguments.property} must be a valid Stripe Product ID (e.g., prod_<alphanumeric>)`;
  }
}
