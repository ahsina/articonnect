import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray } from 'class-validator';

/**
 * Device fingerprint information
 */
export class DeviceFingerprintDto {
  @IsString()
  @IsNotEmpty()
  fingerprintId: string;

  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  screenResolution?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsArray()
  @IsOptional()
  plugins?: string[];

  @IsString()
  @IsOptional()
  canvas?: string; // Canvas fingerprint

  @IsString()
  @IsOptional()
  webgl?: string; // WebGL fingerprint
}

/**
 * Multi-account detection result
 */
export interface MultiAccountDetectionResult {
  isSuspicious: boolean;
  riskScore: number; // 0-100
  linkedAccounts: string[]; // User IDs of linked accounts
  signals: AccountLinkSignal[];
  recommendation: 'ALLOW' | 'FLAG' | 'BLOCK' | 'MANUAL_REVIEW';
}

/**
 * Signal indicating account linkage
 */
export interface AccountLinkSignal {
  type:
    | 'EMAIL_SIMILARITY'
    | 'PHONE_MATCH'
    | 'DEVICE_MATCH'
    | 'IP_MATCH'
    | 'PAYMENT_METHOD_MATCH'
    | 'BEHAVIORAL_PATTERN'
    | 'BROWSER_FINGERPRINT';
  confidence: number; // 0-100
  details: string;
}

/**
 * Review fraud detection result
 */
export interface ReviewFraudResult {
  isFraudulent: boolean;
  fraudScore: number; // 0-100
  signals: ReviewFraudSignal[];
  recommendation: 'ALLOW' | 'HIDE' | 'DELETE' | 'MANUAL_REVIEW';
  aiGenerated: boolean;
}

/**
 * Review fraud signal
 */
export interface ReviewFraudSignal {
  type:
    | 'VELOCITY_SPIKE'
    | 'TEXT_DUPLICATE'
    | 'RATING_ANOMALY'
    | 'REVIEWER_RELATIONSHIP'
    | 'AI_GENERATED'
    | 'PREMATURE_REVIEW'
    | 'NO_PAYMENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

/**
 * Payout fraud detection result
 */
export interface PayoutFraudResult {
  isRisky: boolean;
  riskScore: number; // 0-100
  signals: PayoutFraudSignal[];
  recommendation: 'APPROVE' | 'HOLD_24H' | 'HOLD_48H' | 'MANUAL_REVIEW' | 'BLOCK';
}

/**
 * Payout fraud signal
 */
export interface PayoutFraudSignal {
  type:
    | 'FIRST_PAYOUT_HIGH_VALUE'
    | 'NEW_BANK_ACCOUNT'
    | 'RAPID_COMPLETION'
    | 'SAME_CLIENT_REPEATEDLY'
    | 'ACCOUNT_TAKEOVER'
    | 'GEO_MISMATCH'
    | 'NO_HISTORY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

/**
 * Price anomaly detection result
 */
export interface PriceAnomalyResult {
  isAnomalous: boolean;
  expectedPrice: number;
  actualPrice: number;
  deviationPercentage: number;
  signals: PriceAnomalySignal[];
  recommendation: 'ALLOW' | 'FLAG' | 'ADJUST_COMMISSION' | 'MANUAL_REVIEW';
}

/**
 * Price anomaly signal
 */
export interface PriceAnomalySignal {
  type:
    | 'BELOW_MARKET'
    | 'BELOW_ARTISAN_RATE'
    | 'IMMEDIATE_ACCEPTANCE'
    | 'COLLUSION_PATTERN'
    | 'COMMISSION_AVOIDANCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  marketAverage?: number;
}

/**
 * Refund abuse detection result
 */
export interface RefundAbuseResult {
  isAbusive: boolean;
  abuseScore: number; // 0-100
  signals: RefundAbuseSignal[];
  recommendation: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW' | 'REQUIRE_DEPOSIT';
}

/**
 * Refund abuse signal
 */
export interface RefundAbuseSignal {
  type:
    | 'HIGH_REFUND_RATE'
    | 'SERIAL_DISPUTER'
    | 'CHARGEBACK_HISTORY'
    | 'SAME_REASON_REPEATEDLY'
    | 'LATE_DISPUTE_PATTERN'
    | 'ARTISAN_COMPLAINTS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  historicalData?: any;
}

/**
 * Session anomaly detection result
 */
export interface SessionAnomalyResult {
  isAnomalous: boolean;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: SessionAnomalySignal[];
  recommendation: 'ALLOW' | 'CHALLENGE_2FA' | 'FORCE_LOGOUT' | 'BLOCK_IP';
}

/**
 * Session anomaly signal
 */
export interface SessionAnomalySignal {
  type:
    | 'IMPOSSIBLE_TRAVEL'
    | 'DEVICE_CHANGE'
    | 'IP_JUMP'
    | 'USER_AGENT_CHANGE'
    | 'UNUSUAL_HOURS'
    | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  previousValue?: string;
  currentValue?: string;
}

/**
 * Bot detection result
 */
export interface BotDetectionResult {
  isBot: boolean;
  botScore: number; // 0-100
  signals: BotDetectionSignal[];
  recommendation: 'ALLOW' | 'CHALLENGE_CAPTCHA' | 'RATE_LIMIT' | 'BLOCK';
}

/**
 * Bot detection signal
 */
export interface BotDetectionSignal {
  type:
    | 'REGULAR_PATTERN'
    | 'MISSING_HEADERS'
    | 'HEADLESS_BROWSER'
    | 'NO_MOUSE_MOVEMENT'
    | 'RAPID_REQUESTS'
    | 'SCRAPING_PATTERN';
  confidence: number; // 0-100
  description: string;
}
