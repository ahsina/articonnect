import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateReviewResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Response must be at most 1000 characters' })
  response: string;
}

export class UpdateReviewResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  response: string;
}
