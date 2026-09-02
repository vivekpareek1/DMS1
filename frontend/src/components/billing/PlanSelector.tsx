
'use client';
import { useEffect, useState } from 'react';

type Edition = 'BASIC' | 'STANDARD' | 'ENTERPRISE';

interface EditionFeatures {
  maxUsers: number;
  maxStorageGB: number;
  dwgViewer: boolean;
  excelEditor: boolean;
  auditLogDays: number;
  pricePerUserMonthINR: number;
  yearlyDiscount: number;
  name: string;
  dlp: {
    enabled: boolean;
    piiDetection: boolean;
    watermarking: boolean;
    screenshotDetection: boolean;
  };
}

interface PlanSelectorProps {
  onSelect: (edition: Edition, seats: number, billing: 'MONTHLY' | 'YEARLY') => void;
}

const API_BASE = '/api';

export function PlanSelector({ onSelect }: PlanSelectorProps) {
  const [seats, setSeats] = useState(10);
  const [billing, setBilling] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [editions, setEditions] = useState<Record<Edition, EditionFeatures> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Plans come from the backend (single source of truth for pricing) rather
    // than a duplicated local copy that can drift out of sync.
    fetch(`${API_BASE}/billing/plans`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load plans (${res.status})`);
        return res.json();
      })
      .then(setEditions)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="max-w-xl mx-auto p-6 text-center text-red-600">Couldn't load plans: {error}</div>;
  }
  if (!editions) {
    return <div className="max-w-xl mx-auto p-6 text-center text-zinc-500">Loading plans…</div>;
  }

  const editionKeys: Edition[] = ['BASIC', 'STANDARD', 'ENTERPRISE'];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-2">Choose Your Plan</h1>
      <p className="text-center text-zinc-500 mb-8">Select plan before activation - Credit card payment required</p>

      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-zinc-100 rounded-full p-1 flex">
          <button
            onClick={() => setBilling('MONTHLY')}
            className={`px-6 py-2 rounded-full ${billing === 'MONTHLY' ? 'bg-white shadow' : ''}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('YEARLY')}
            className={`px-6 py-2 rounded-full ${billing === 'YEARLY' ? 'bg-white shadow' : ''}`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Seats selector */}
      <div className="flex justify-center mb-8">
        <label className="mr-4">Number of users:</label>
        <input
          type="number"
          value={seats}
          onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
          min={1}
          max={1000}
          className="border rounded px-3 py-1 w-24"
        />
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {editionKeys.map((editionKey) => {
          const edition = editions[editionKey];
          const monthlyPrice = edition.pricePerUserMonthINR;
          const yearlyPrice = Math.round(monthlyPrice * (1 - edition.yearlyDiscount / 100));
          const displayPrice = billing === 'YEARLY' ? yearlyPrice : monthlyPrice;
          const total = displayPrice * seats;
          const gst = Math.round(total * 0.18);
          const grandTotal = total + gst;

          return (
            <div key={editionKey} className={`border rounded-xl p-6 ${editionKey === 'STANDARD' ? 'border-black ring-2 ring-black' : ''}`}>
              {editionKey === 'STANDARD' && <div className="bg-black text-white text-xs px-3 py-1 rounded-full inline-block mb-2">Most Popular</div>}
              {editionKey === 'ENTERPRISE' && <div className="bg-red-600 text-white text-xs px-3 py-1 rounded-full inline-block mb-2">Full DLP 🔒</div>}

              <h3 className="text-xl font-bold">{edition.name}</h3>
              <div className="mt-4">
                <span className="text-3xl font-bold">₹{displayPrice}</span>
                <span className="text-zinc-500">/user/mo</span>
                {billing === 'YEARLY' && <span className="text-green-600 text-sm ml-2">Save {edition.yearlyDiscount}%</span>}
              </div>
              <div className="text-sm text-zinc-500 mt-1">
                Total: ₹{total} + GST ₹{gst} = <b>₹{grandTotal}/mo</b> for {seats} users
              </div>

              <ul className="mt-6 space-y-2 text-sm">
                <li>✅ {edition.maxUsers === -1 ? 'Unlimited' : edition.maxUsers} users max</li>
                <li>✅ {edition.maxStorageGB === -1 ? 'Unlimited' : edition.maxStorageGB + 'GB'} storage</li>
                <li>✅ {edition.excelEditor ? 'Excel Editor' : 'Excel Viewer'}</li>
                <li>✅ {edition.dwgViewer ? 'DWG Viewer' : 'No DWG'}</li>
                {edition.dlp.watermarking && <li>✅ Dynamic watermarking</li>}
                {edition.dlp.screenshotDetection && <li>✅ Screenshot detection</li>}
                {edition.dlp.piiDetection && <li>✅ PII Detection (Aadhaar/PAN)</li>}
                <li>✅ {edition.auditLogDays} days audit log</li>
              </ul>

              <button
                onClick={() => onSelect(editionKey, seats, billing)}
                className={`w-full mt-6 py-3 rounded-lg font-bold ${editionKey === 'STANDARD' ? 'bg-black text-white' : 'bg-zinc-100'}`}
              >
                Choose {editionKey} - Pay ₹{grandTotal} via Credit Card
              </button>
              <p className="text-xs text-zinc-500 mt-2 text-center">Payment required before activation</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
