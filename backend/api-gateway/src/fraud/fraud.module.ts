import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MultiAccountDetectorService } from './services/multi-account-detector.service';
import { ReviewFraudDetectorService } from './services/review-fraud-detector.service';
import { PayoutFraudDetectorService } from './services/payout-fraud-detector.service';
import { PriceAnomalyDetectorService } from './services/price-anomaly-detector.service';
import { RefundAbuseDetectorService } from './services/refund-abuse-detector.service';
import { SessionAnomalyDetectorService } from './services/session-anomaly-detector.service';
import { BotDetectorService } from './services/bot-detector.service';
import { FeatureToggleService } from './services/feature-toggle.service';
import { SessionAnomalyGuard } from './guards/session-anomaly.guard';
import { BotDetectionGuard } from './guards/bot-detection.guard';
import { FraudController } from './controllers/fraud.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FraudController],
  providers: [
    FeatureToggleService,
    MultiAccountDetectorService,
    ReviewFraudDetectorService,
    PayoutFraudDetectorService,
    PriceAnomalyDetectorService,
    RefundAbuseDetectorService,
    SessionAnomalyDetectorService,
    BotDetectorService,
    SessionAnomalyGuard,
    BotDetectionGuard,
  ],
  exports: [
    FeatureToggleService,
    MultiAccountDetectorService,
    ReviewFraudDetectorService,
    PayoutFraudDetectorService,
    PriceAnomalyDetectorService,
    RefundAbuseDetectorService,
    SessionAnomalyDetectorService,
    BotDetectorService,
    SessionAnomalyGuard,
    BotDetectionGuard,
  ],
})
export class FraudModule {}
