import { Expose } from 'class-transformer';

export class CheckoutSessionDto {
  @Expose()
  url: string;
}
