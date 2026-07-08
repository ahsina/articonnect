import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Ip,
  Headers,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { SignatureService } from '../services/signature.service';

class PublicSignDto {
  @IsOptional()
  @IsString()
  signatureImage?: string;

  @IsEnum(['DRAWN', 'TYPED', 'CHECKBOX'])
  signatureType: 'DRAWN' | 'TYPED' | 'CHECKBOX';

  @IsString()
  @IsNotEmpty()
  signerName: string;

  @IsEmail()
  signerEmail: string;
}

/**
 * Public signature controller (no authentication required)
 * Allows clients to sign quotes via secure token links
 */
@Controller('sign')
export class SignatureController {
  constructor(private readonly signatureService: SignatureService) {}

  /**
   * Get quote details by signature token (public)
   */
  @Get(':token')
  async getQuoteByToken(@Param('token') token: string) {
    return this.signatureService.getQuoteBySignatureToken(token);
  }

  /**
   * Sign quote using signature token (public - for clients)
   */
  @Post(':token')
  async signWithToken(
    @Param('token') token: string,
    @Body() dto: PublicSignDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // Get the quote and client info from the token
    const { quote } = await this.signatureService.getQuoteBySignatureToken(token);

    // Sign the quote on behalf of the client
    return this.signatureService.signQuote({
      quoteId: quote.id,
      signerId: quote.clientId,
      signerRole: 'CLIENT',
      signatureImage: dto.signatureImage,
      signatureType: dto.signatureType,
      ipAddress: ip,
      userAgent: userAgent || 'Unknown',
    });
  }
}
