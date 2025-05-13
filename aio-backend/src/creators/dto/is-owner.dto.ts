import { Expose } from 'class-transformer';

export class IsOwnerDto {
  @Expose()
  isOwner: boolean;
}
