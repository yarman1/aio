import { OmitType } from '@nestjs/swagger';
import { ReadCreatorDto } from './read-creator.dto';
import { Expose } from 'class-transformer';

export class ReadPublicCreatorDto extends OmitType(ReadCreatorDto, [
  'isStripeAccountVerified',
] as const) {
  @Expose()
  id: number;
}
