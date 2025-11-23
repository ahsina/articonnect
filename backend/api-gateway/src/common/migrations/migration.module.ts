import { Module } from '@nestjs/common';
import { ArtisanToCompanyMigrationService } from './artisan-to-company-migration.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ArtisanToCompanyMigrationService],
  exports: [ArtisanToCompanyMigrationService],
})
export class MigrationModule {}
