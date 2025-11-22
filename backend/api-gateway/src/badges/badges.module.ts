import { Module } from '@nestjs/common';
import { BadgesService } from './services/badges.service';
import { BadgesController } from './controllers/badges.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
