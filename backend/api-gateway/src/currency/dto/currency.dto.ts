import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsEnum,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @Length(3, 3)
  code: string; // ISO 4217 code (EUR, GBP, CHF, USD)

  @IsString()
  name: string;

  @IsString()
  symbol: string;

  @IsNumber()
  @Min(0)
  @Max(4)
  decimalPlaces: number;

  @IsString()
  @IsOptional()
  symbolPosition?: string; // 'before' or 'after'

  @IsString()
  @IsOptional()
  thousandsSeparator?: string;

  @IsString()
  @IsOptional()
  decimalSeparator?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCurrencyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsNumber()
  @Min(0)
  @Max(4)
  @IsOptional()
  decimalPlaces?: number;

  @IsString()
  @IsOptional()
  symbolPosition?: string;

  @IsString()
  @IsOptional()
  thousandsSeparator?: string;

  @IsString()
  @IsOptional()
  decimalSeparator?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateExchangeRateDto {
  @IsString()
  @Length(3, 3)
  fromCurrency: string;

  @IsString()
  @Length(3, 3)
  toCurrency: string;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsString()
  @IsOptional()
  source?: string; // 'manual', 'api', 'ecb', etc.
}

export class ConvertCurrencyDto {
  @IsNumber()
  amount: number;

  @IsString()
  @Length(3, 3)
  fromCurrency: string;

  @IsString()
  @Length(3, 3)
  toCurrency: string;
}

export class SetUserCurrencyDto {
  @IsString()
  @Length(3, 3)
  currencyCode: string;
}
