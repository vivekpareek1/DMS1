
'use client';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentCheckoutProps {
  subscriptionId: string;
  razorpayOrderId: string;
  amountINR: number;
  edition: string;
  onSuccess: (data: any) => void;
  onFailure: (error: any) => void;
}

export function PaymentCheckout({ subscriptionId, razorpayOrderId, amountINR, edition, onSuccess, onFailure }: PaymentCheckoutProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = () => {
    setLoading(true);
    
    if (!window.Razorpay) {
      onFailure('Razorpay not loaded');
      setLoading(false);
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Your Razorpay Key
      amount: amountINR * 100, // paise
      currency: 'INR',
      name: 'Vault DMS',
      description: `${edition} Edition Subscription`,
      order_id: razorpayOrderId,
      handler: async function (response: any) {
        // Verify payment on backend
        try {
          const res = await fetch('/api/billing/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptionId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature
            })
          });
          const data = await res.json();
          if (res.ok) {
            onSuccess(data);
          } else {
            onFailure(data);
          }
        } catch (err) {
          onFailure(err);
        }
        setLoading(false);
      },
      prefill: {
        name: 'Company Admin',
        email: 'admin@company.com'
      },
      theme: {
        color: '#000000'
      },
      modal: {
        ondismiss: function() {
          setLoading(false);
          onFailure('Payment cancelled');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="max-w-md mx-auto p-6 border rounded-xl">
      <h2 className="text-2xl font-bold mb-4">Complete Payment - Credit Card Required</h2>
      <p className="text-zinc-600 mb-2">Edition: <b>{edition}</b></p>
      <p className="text-zinc-600 mb-2">Amount: <b>₹{amountINR}</b> (incl. 18% GST)</p>
      <p className="text-sm text-red-600 mb-6">⚠️ Subscription will activate ONLY after successful credit card payment</p>
      
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg font-bold disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay ₹${amountINR} via Credit Card / UPI / NetBanking`}
      </button>
      
      <p className="text-xs text-zinc-500 mt-4 text-center">
        Secured by Razorpay - Supports Visa, Mastercard, Rupay, UPI
      </p>
      
      <div className="mt-6 p-3 bg-yellow-50 rounded text-xs">
        <b>Test Card for Development:</b><br/>
        Card: 4111 1111 1111 1111<br/>
        Expiry: 12/30, CVV: 123<br/>
        (Use in Razorpay test mode)
      </div>
    </div>
  );
}
