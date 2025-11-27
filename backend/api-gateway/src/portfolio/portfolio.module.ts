import { Module } from '@nestjs/common';
import { PortfolioController } from './controllers/portfolio.controller';
import { PortfolioService } from './services/portfolio.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
