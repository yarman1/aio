import { Expose, Type } from 'class-transformer';
import { PreviewInvoiceLineDto } from './preview-invoice-line.dto';

export class PreviewSubscriptionUpgradeDto {
  @Expose()
  amountDue: number;

  @Expose()
  currency: string;

  @Expose()
  @Type(() => PreviewInvoiceLineDto)
  lines: PreviewInvoiceLineDto[];

  @Expose()
  periodStart: number;

  @Expose()
  periodEnd: number;
}
