import { Module } from '@nestjs/common';
import { CountryController, ArtisanComplianceController } from './controllers/country.controller';
import { CountryService } from './services/country.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CountryController, ArtisanComplianceController],
  providers: [CountryService],
  exports: [CountryService],
})
export class CountryModule {}
