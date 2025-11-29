import { Module } from '@nestjs/common';
import { I18nController } from './controllers/i18n.controller';
import { I18nService } from './services/i18n.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [I18nController],
  providers: [I18nService],
  exports: [I18nService],
})
export class I18nModule {}
