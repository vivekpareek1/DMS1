
'use client';
import { useState } from 'react';
import { PlanSelector } from '@/components/billing/PlanSelector';
import { PaymentCheckout } from '@/components/billing/PaymentCheckout';
import { CompanyLogoUpload } from '@/components/company/CompanyLogoUpload';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { authedFetch, storeToken } from '@/lib/api';

type Step = 'COMPANY' | 'PLAN' | 'PAYMENT' | 'SUCCESS';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('COMPANY');
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [companyId, setCompanyId] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [subscription, setSubscription] = useState<any>(null);
  const [razorpayOrder, setRazorpayOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Google Sign-In verifies identity server-side, then creates the
  // company + first (admin) user in one call.
  const handleGoogleCredential = async (idToken: string) => {
    if (!companyName.trim()) {
      setError('Enter a company name before signing in.');
      return;
    }
    setError(null);
    const res = await authedFetch('/auth/google-signup', {
      method: 'POST',
      body: JSON.stringify({ idToken, companyName, companyDomain }),
    });
    const data = await res.json();
    if (res.ok) {
      storeToken(data.accessToken);
      setCompanyId(data.user.companyId);
      setStep('PLAN');
    } else {
      setError(data.message || 'Sign-in failed');
    }
  };

  // Step 2: Plan selection
  const handlePlanSelect = async (edition: any, seats: number, billing: any) => {
    setError(null);
    const res = await authedFetch('/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ companyId, edition, seats, billingCycle: billing }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubscription(data.subscription);
      setRazorpayOrder(data.razorpayOrder);
      setStep('PAYMENT');
    } else {
      setError(data.message || 'Could not start subscription');
    }
  };

  // Step 3: Payment success
  const handlePaymentSuccess = () => {
    setStep('SUCCESS');
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="h-8" /> : <span className="font-bold">Vault DMS</span>}
          <span className="text-zinc-500">| Signup</span>
        </div>
        <div className="text-sm">Step: {step}</div>
      </header>

      <div className="p-6">
        {error && <div className="max-w-md mx-auto mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

        {step === 'COMPANY' && (
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6">Create Your Company</h1>
            <input
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border p-3 rounded mb-3"
            />
            <input
              placeholder="Company Domain (company.com) - optional"
              value={companyDomain}
              onChange={(e) => setCompanyDomain(e.target.value)}
              className="w-full border p-3 rounded mb-6"
            />
            <p className="text-sm text-zinc-500 mb-3">Sign in with the Google account that should be the company admin:</p>
            <GoogleSignInButton onCredential={handleGoogleCredential} />
          </div>
        )}

        {step === 'PLAN' && companyId && (
          <div>
            <div className="max-w-4xl mx-auto mb-6">
              <CompanyLogoUpload companyId={companyId} currentLogoUrl={logoUrl} onUploadSuccess={setLogoUrl} />
            </div>
            <PlanSelector onSelect={handlePlanSelect} />
          </div>
        )}

        {step === 'PAYMENT' && subscription && razorpayOrder && (
          <PaymentCheckout
            subscriptionId={subscription.id}
            razorpayOrderId={razorpayOrder.id}
            amountINR={subscription.grandTotalINR}
            edition={subscription.edition}
            onSuccess={handlePaymentSuccess}
            onFailure={(err) => setError(typeof err === 'string' ? err : JSON.stringify(err))}
          />
        )}

        {step === 'SUCCESS' && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-zinc-600 mb-6">Your subscription is now ACTIVE.</p>
            <a href="/" className="bg-black text-white px-8 py-3 rounded-lg">Go to Vault DMS</a>
          </div>
        )}
      </div>
    </div>
  );
}
