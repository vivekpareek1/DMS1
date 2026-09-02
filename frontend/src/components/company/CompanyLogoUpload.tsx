
'use client';
import { useState } from 'react';
import { authedFetch } from '@/lib/api';

interface CompanyLogoUploadProps {
  companyId: string;
  currentLogoUrl?: string;
  onUploadSuccess: (logoUrl: string) => void;
}

export function CompanyLogoUpload({ companyId, currentLogoUrl, onUploadSuccess }: CompanyLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentLogoUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be <2MB');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('companyId', companyId);

    try {
      const res = await fetch(`/api/company/${companyId}/logo`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        onUploadSuccess(data.logoUrl);
        alert('Company logo updated! White-label branding active.');
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (err) {
      alert('Upload failed');
    }
    setUploading(false);
  };

  return (
    <div className="p-6 border rounded-xl">
      <h3 className="font-bold mb-2">Company Logo - White Label</h3>
      <p className="text-sm text-zinc-500 mb-4">Upload your company logo - It will appear on all pages (Enterprise white-label feature)</p>
      
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-zinc-50">
          {preview ? (
            <img src={preview} alt="Company Logo" className="max-w-full max-h-full" />
          ) : (
            <span className="text-zinc-400">No Logo</span>
          )}
        </div>
        
        <div>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleFileChange} className="block" />
          <p className="text-xs text-zinc-500 mt-1">PNG, JPG, SVG - Max 2MB - Recommended 200x200px</p>
          {uploading && <p className="text-sm mt-2">Uploading...</p>}
        </div>
      </div>

      <div className="mt-4 p-3 bg-zinc-50 rounded text-xs">
        <b>White-label:</b> Your logo will replace Vault DMS logo on login, header, and all pages. Your customers see your brand.
      </div>
    </div>
  );
}
