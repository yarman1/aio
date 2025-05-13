import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { IntervalTypes } from '../types/interval.type';

@ValidatorConstraint({ name: 'isInterval', async: false })
export class IsIntervalValidator implements ValidatorConstraintInterface {
  validate(value: string) {
    return IntervalTypes.includes(value);
  }

  defaultMessage(): string {
    return `The value must be a valid interval type: ${IntervalTypes.join(', ')}`;
  }
}
