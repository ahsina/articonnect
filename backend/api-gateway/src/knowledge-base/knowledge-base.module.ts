import { Module } from '@nestjs/common';
import { KnowledgeBaseController } from './controllers/knowledge-base.controller';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
