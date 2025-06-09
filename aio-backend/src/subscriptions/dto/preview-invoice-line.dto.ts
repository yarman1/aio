import { Expose } from 'class-transformer';

export class PreviewInvoiceLineDto {
  @Expose()
  description: string;

  @Expose()
  amount: number;

  @Expose()
  quantity: number;
}
