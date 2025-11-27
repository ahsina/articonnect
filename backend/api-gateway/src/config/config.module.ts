import { Module, Global } from '@nestjs/common';
import { ConfigService } from './services/config.service';
import { PlatformConfigService } from './services/platform-config.service';
import { ConfigController } from './controllers/config.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ConfigController],
  providers: [ConfigService, PlatformConfigService],
  exports: [ConfigService, PlatformConfigService],
})
export class ConfigModule {}
