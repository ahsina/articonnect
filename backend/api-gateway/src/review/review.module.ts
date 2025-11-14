import { Module } from '@nestjs/common';
import { ReviewController } from './controllers/review.controller';
import { ReviewResponseController } from './controllers/review-response.controller';
import { ReviewService } from './services/review.service';
import { ReviewResponseService } from './services/review-response.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ReviewController, ReviewResponseController],
  providers: [ReviewService, ReviewResponseService],
  exports: [ReviewService, ReviewResponseService],
})
export class ReviewModule {}
