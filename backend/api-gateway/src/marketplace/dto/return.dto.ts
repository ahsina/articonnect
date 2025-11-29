import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUUID,
  IsDecimal,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReturnReason {
  DEFECTIVE = 'DEFECTIVE',
  WRONG_ITEM = 'WRONG_ITEM',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  CHANGED_MIND = 'CHANGED_MIND',
  DAMAGED_IN_TRANSIT = 'DAMAGED_IN_TRANSIT',
  MISSING_PARTS = 'MISSING_PARTS',
  OTHER = 'OTHER',
}

export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURN_SHIPPED = 'RETURN_SHIPPED',
  RECEIVED = 'RECEIVED',
  INSPECTING = 'INSPECTING',
  REFUNDED = 'REFUNDED',
  COMPLETED = 'COMPLETED',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT',
  STORE_CREDIT = 'STORE_CREDIT',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export class ReturnItemDto {
  @IsUUID()
  orderItemId: string;

  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reasonDetails?: string;
}

export class CreateReturnRequestDto {
  @IsUUID()
  orderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsEnum(RefundMethod)
  @IsOptional()
  preferredRefundMethod?: RefundMethod;
}

export class UpdateReturnStatusDto {
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsString()
  @IsOptional()
  returnLabel?: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;
}

export class ApproveReturnDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  approvalNotes?: string;

  @IsString()
  @IsOptional()
  returnLabel?: string;

  @IsString()
  @IsOptional()
  returnAddress?: string;

  @IsOptional()
  partialRefundAmount?: number;
}

export class RejectReturnDto {
  @IsString()
  @MaxLength(500)
  rejectionReason: string;
}

export class ProcessRefundDto {
  @IsOptional()
  refundAmount?: number;

  @IsEnum(RefundMethod)
  @IsOptional()
  refundMethod?: RefundMethod;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  refundNotes?: string;

  @IsOptional()
  restockItems?: boolean;
}

export class ReceiveReturnDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  items: ReceivedItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  inspectionNotes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  inspectionPhotos?: string[];
}

export class ReceivedItemDto {
  @IsUUID()
  returnItemId: string;

  @IsInt()
  @Min(0)
  receivedQuantity: number;

  @IsString()
  condition: 'GOOD' | 'DAMAGED' | 'UNSELLABLE';

  @IsOptional()
  restockable?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReturnFilterDto {
  @IsEnum(ReturnStatus)
  @IsOptional()
  status?: ReturnStatus;

  @IsEnum(ReturnReason)
  @IsOptional()
  reason?: ReturnReason;

  @IsUUID()
  @IsOptional()
  orderId?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class GenerateReturnLabelDto {
  @IsString()
  carrierCode: string;

  @IsOptional()
  serviceCode?: string;

  @IsOptional()
  weight?: number;

  @IsOptional()
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}
