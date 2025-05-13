import { Expose, Type } from 'class-transformer';
import { ReadCreatorCategoryDto } from './read-creator-category.dto';
import { ReadExternalBenefitDto } from './read-external-benefit.dto';

export class ReadPlanDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;

  @Expose()
  description: string;

  @Expose()
  price: number;

  @Expose()
  isArchived: boolean;

  @Expose()
  interval: string;

  @Expose()
  intervalCount: number;

  @Expose()
  @Type(() => ReadCreatorCategoryDto)
  creatorCategories: ReadCreatorCategoryDto[];

  @Expose()
  @Type(() => ReadExternalBenefitDto)
  externalBenefits: ReadExternalBenefitDto[];
}
