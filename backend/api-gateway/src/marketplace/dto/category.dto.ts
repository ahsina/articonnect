import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Menuiserie' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'menuiserie', description: 'Identifiant URL unique' })
  @IsString()
  @MaxLength(120)
  slug: string;

  @ApiProperty({ required: false, example: 'Travaux et produits en bois sur mesure' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false, example: 'hammer', description: 'Nom d\'icône ou emoji' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  icon?: string;

  @ApiProperty({ required: false, description: 'ID de la catégorie parente (sous-catégorie)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  icon?: string;

  @ApiProperty({ required: false, description: 'Activer/désactiver la catégorie' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
