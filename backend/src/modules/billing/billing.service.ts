
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EDITIONS, Edition } from '../../common/config/edition.config';
import { PrismaService } from '../../prisma.service';

// Razorpay and Stripe - for India and International
// npm install razorpay stripe

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private razorpay: any;
  private stripe: any;

  constructor(private prisma: PrismaService) {
    // Initialize Razorpay (India - primary for you)
    if (process.env.RAZORPAY_KEY_ID) {
      const Razorpay = require('razorpay');
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
    }
    // Initialize Stripe (International)
    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = require('stripe');
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
  }

  // STEP 1: Choose plan during signup - create pending subscription
  async createSubscription(data: {
    companyId: string,
    edition: Edition,
    seats: number,
    billingCycle: 'MONTHLY' | 'YEARLY'
  }) {
    const edition = EDITIONS[data.edition];
    if (!edition) throw new BadRequestException('Invalid edition');

    const pricePerSeat = edition.pricePerUserMonthINR;
    const totalAmount = pricePerSeat * data.seats;
    const discountedTotal = data.billingCycle === 'YEARLY' 
      ? Math.round(totalAmount * (1 - edition.yearlyDiscount/100))
      : totalAmount;
    const gstAmount = Math.round(discountedTotal * 0.18);
    const grandTotal = discountedTotal + gstAmount;

    // Create pending subscription - NOT ACTIVE until payment
    const subscription = await this.prisma.subscription.create({
      data: {
        companyId: data.companyId,
        edition: data.edition,
        status: 'PENDING',
        billingCycle: data.billingCycle,
        seats: data.seats,
        pricePerSeatINR: pricePerSeat,
        totalAmountINR: discountedTotal,
        gstAmountINR: gstAmount,
        grandTotalINR: grandTotal
      }
    });

    // Create Razorpay Order for payment
    let razorpayOrder: any = null;
    if (this.razorpay) {
      razorpayOrder = await this.razorpay.orders.create({
        amount: grandTotal * 100, // Razorpay expects paise
        currency: 'INR',
        receipt: `sub_${subscription.id}`,
        notes: {
          companyId: data.companyId,
          edition: data.edition,
          seats: data.seats
        }
      });

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { razorpayOrderId: razorpayOrder.id }
      });
    }

    this.logger.log(`Subscription PENDING created: ${subscription.id} for ${data.companyId} - ${data.edition} - ₹${grandTotal}`);

    return {
      subscription,
      razorpayOrder,
      paymentRequired: true,
      amountINR: grandTotal,
      message: 'Subscription created - Payment required to activate. Pay via credit card to activate.'
    };
  }

  // STEP 2: Verify payment and activate subscription - BEFORE activation payment must be done
  async verifyPaymentAndActivate(data: {
    subscriptionId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string
  }) {
    // Verify Razorpay signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(data.razorpayOrderId + '|' + data.razorpayPaymentId)
      .digest('hex');

    if (expectedSignature !== data.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Get subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: data.subscriptionId }
    });
    if (!subscription) throw new BadRequestException('Subscription not found');
    if (subscription.status !== 'PENDING') throw new BadRequestException('Subscription already processed');

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amountINR: subscription.totalAmountINR,
        gstINR: subscription.gstAmountINR,
        grandTotalINR: subscription.grandTotalINR,
        status: 'SUCCESS',
        method: 'razorpay',
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId
      }
    });

    // Activate subscription - ONLY after payment success
    const now = new Date();
    const endDate = new Date();
    if (subscription.billingCycle === 'MONTHLY') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const activated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        razorpayPaymentId: data.razorpayPaymentId,
        startDate: now,
        endDate: endDate
      }
    });

    this.logger.log(`Subscription ACTIVATED after payment: ${subscription.id} - Payment ${payment.id}`);

    return {
      subscription: activated,
      payment,
      message: 'Payment verified via credit card - Subscription activated!',
      edition: subscription.edition,
      seats: subscription.seats,
      activeUntil: endDate
    };
  }

  // Check if company has active subscription
  async hasActiveSubscription(companyId: string): Promise<boolean> {
    const active = await this.prisma.subscription.findFirst({
      where: {
        companyId,
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      }
    });
    return !!active;
  }

  // Get subscription for company
  async getCompanySubscription(companyId: string) {
    return await this.prisma.subscription.findFirst({
      where: { companyId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });
  }
}
