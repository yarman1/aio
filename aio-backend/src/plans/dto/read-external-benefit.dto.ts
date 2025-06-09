import { Expose } from 'class-transformer';

export class ReadExternalBenefitDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}
