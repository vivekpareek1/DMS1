
import { Controller, Post, Body, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { EDITIONS } from '../../common/config/edition.config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private billingService: BillingService) {}

  // Public: shown on the pricing/signup page before login.
  @Public()
  @Get('plans')
  getPlans() {
    return EDITIONS;
  }

  // STEP 1: Create subscription (pending) - during signup
  @Post('subscribe')
  async createSubscription(
    @Body() body: {
      companyId: string;
      edition: 'BASIC' | 'STANDARD' | 'ENTERPRISE';
      seats: number;
      billingCycle: 'MONTHLY' | 'YEARLY';
    },
    @Req() req: any,
  ) {
    if (req.user.companyId !== body.companyId) {
      throw new ForbiddenException('Cannot create a subscription for another company');
    }
    return await this.billingService.createSubscription(body);
  }

  // STEP 2: Verify payment and activate - credit card payment required before activation
  @Post('verify-payment')
  async verifyPayment(@Body() body: {
    subscriptionId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string
  }) {
    // Note: authorization here relies on the Razorpay signature check inside
    // BillingService (only someone holding the real payment can produce a
    // valid signature for this order) - subscriptionId doesn't carry a
    // companyId check because the caller doesn't need one to prove payment.
    return await this.billingService.verifyPaymentAndActivate(body);
  }

  // Check subscription status
  @Get('company/:companyId/subscription')
  async getSubscription(@Param('companyId') companyId: string, @Req() req: any) {
    if (req.user.companyId !== companyId) {
      throw new ForbiddenException("Cannot view another company's subscription");
    }
    const sub = await this.billingService.getCompanySubscription(companyId);
    const hasActive = await this.billingService.hasActiveSubscription(companyId);
    return { subscription: sub, hasActive, message: hasActive ? 'Active' : 'No active subscription - Payment required' };
  }
}
