import { Expose } from 'class-transformer';

export class PortalDto {
  @Expose()
  url: string;
}
