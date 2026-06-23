import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { EmailTemplateService } from '../notification/services/email-template.service';

@Global()
@Module({
  // EmailService dépend de EmailTemplateService (sans dépendances) : on le fournit ici
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService],
})
export class EmailModule {}
