import {
  ArrayNotEmpty,
  IsArray,
  IsDecimal,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { IsInterval } from '../decorators/is-interval.decorator';
import { Interval } from '../types/interval.enum';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @IsString()
  @Length(2, 40)
  name: string;

  @IsString()
  @Length(2, 255)
  description: string;

  @IsInterval()
  intervalType: Interval;

  @IsNumber()
  @IsInt()
  @IsPositive()
  intervalCount: number;

  @IsDecimal({ force_decimal: true, decimal_digits: '1,2', locale: 'en-US' })
  price: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  categoryIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  externalBenefits?: number[];
}
