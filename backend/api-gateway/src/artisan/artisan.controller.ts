import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArtisanService } from './artisan.service';

@ApiTags('Artisan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('artisan')
export class ArtisanController {
  constructor(private readonly artisan: ArtisanService) {}

  private uid(req: any): string { return req.user.userId; }

  // Profil
  @Get('profile') getProfile(@Request() req) { return this.artisan.getMyProfile(this.uid(req)); }
  @Put('profile') updateProfile(@Request() req, @Body() dto: any) { return this.artisan.updateProfile(this.uid(req), dto); }
  @Put('availability/toggle') toggle(@Request() req, @Body() dto: { available: boolean }) { return this.artisan.toggleAvailability(this.uid(req), dto.available); }
  @Put('location') location(@Request() req, @Body() dto: { latitude: number; longitude: number }) { return this.artisan.updateLocation(this.uid(req), dto.latitude, dto.longitude); }

  // Stripe
  @Get('stripe/status') stripeStatus(@Request() req) { return this.artisan.getStripeStatus(this.uid(req)); }
  @Post('stripe/onboarding') stripeOnboard(@Request() req) { return this.artisan.createStripeOnboarding(this.uid(req)); }
  @Post('stripe/refresh') stripeRefresh(@Request() req) { return this.artisan.refreshStripeOnboarding(this.uid(req)); }

  // Certifications
  @Get('certifications') getCerts(@Request() req) { return this.artisan.getCertifications(this.uid(req)); }
  @Post('certifications') addCert(@Request() req, @Body() dto: any) { return this.artisan.addCertification(this.uid(req), dto); }
  @Put('certifications/:id') updateCert(@Request() req, @Param('id') id: string, @Body() dto: any) { return this.artisan.updateCertification(this.uid(req), id, dto); }
  @Delete('certifications/:id') deleteCert(@Request() req, @Param('id') id: string) { return this.artisan.deleteCertification(this.uid(req), id); }

  // Working hours
  @Get('working-hours') getWH(@Request() req) { return this.artisan.getWorkingHours(this.uid(req)); }
  @Put('working-hours') setWH(@Request() req, @Body() body: { workingHours: any[] }) { return this.artisan.setWorkingHours(this.uid(req), body.workingHours); }

  // Availability slots
  @Get('availability') getAvail(@Request() req, @Query() q: any) { return this.artisan.getAvailability(this.uid(req), q); }
  @Post('availability') addAvail(@Request() req, @Body() dto: any) { return this.artisan.createAvailability(this.uid(req), dto); }
  @Delete('availability/:id') delAvail(@Request() req, @Param('id') id: string) { return this.artisan.deleteAvailability(this.uid(req), id); }

  // Time off
  @Get('time-off') getTO(@Request() req) { return this.artisan.getTimeOffs(this.uid(req)); }
  @Post('time-off') addTO(@Request() req, @Body() dto: any) { return this.artisan.requestTimeOff(this.uid(req), dto); }
  @Delete('time-off/:id') delTO(@Request() req, @Param('id') id: string) { return this.artisan.cancelTimeOff(this.uid(req), id); }

  // Reviews
  @Get('reviews') getReviews(@Request() req, @Query() q: any) { return this.artisan.getMyReviews(this.uid(req), q); }

  // Quotations (devis)
  @Get('quotations') getQuotations(@Request() req, @Query() q: any) { return this.artisan.getQuotations(this.uid(req), q); }

  // Earnings / dashboard / analytics
  @Get('earnings') getEarnings(@Request() req, @Query() q: any) { return this.artisan.getEarnings(this.uid(req), q); }
  @Get('earnings/summary') getEarningsSummary(@Request() req) { return this.artisan.getEarningsSummary(this.uid(req)); }
  @Get('dashboard') getDashboard(@Request() req) { return this.artisan.getDashboard(this.uid(req)); }
  @Get('analytics') getAnalytics(@Request() req) { return this.artisan.getAnalytics(this.uid(req)); }

  // Vérification KYC (côté artisan) — état + re-soumission (débloque un REJECTED)
  @Get('verification') getVerification(@Request() req) { return this.artisan.getVerification(this.uid(req)); }
  @Post('verification/resubmit') resubmitVerification(@Request() req, @Body() dto: any) { return this.artisan.resubmitVerification(this.uid(req), dto); }

  // Notification preferences
  @Get('notification-preferences') getNotif(@Request() req) { return this.artisan.getNotificationPreferences(this.uid(req)); }
  @Put('notification-preferences') setNotif(@Request() req, @Body() dto: any) { return this.artisan.updateNotificationPreferences(this.uid(req), dto); }
}
