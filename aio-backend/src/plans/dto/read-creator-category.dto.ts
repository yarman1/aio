import { Expose } from 'class-transformer';

export class ReadCreatorCategoryDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  isPublic: boolean;
}
