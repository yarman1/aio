import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateCreatorCategoryDto {
  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
