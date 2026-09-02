
'use client';
import { useEffect, useState } from 'react';

interface WatermarkProps {
  userEmail: string;
  ip: string;
  classification: string;
  enabled: boolean;
}

export function WatermarkOverlay({ userEmail, ip, classification, enabled }: WatermarkProps) {
  const [watermarkText, setWatermarkText] = useState('');

  useEffect(() => {
    if (!enabled) return;
    const text = `${userEmail} | ${ip} | ${new Date().toLocaleString()} | ${classification}`;
    setWatermarkText(text);
  }, [userEmail, ip, classification, enabled]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-10">
      <div className="absolute inset-0 flex flex-wrap">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-1/3 h-1/4 flex items-center justify-center -rotate-45 text-lg font-bold select-none">
            {watermarkText}
          </div>
        ))}
      </div>
    </div>
  );
}

// DLP: Block clipboard, print, right-click for Enterprise
export function useDlpProtection(enabled: { clipboard: boolean, print: boolean }) {
  useEffect(() => {
    if (!enabled.clipboard && !enabled.print) return;

    const handleCopy = (e: ClipboardEvent) => {
      if (enabled.clipboard) {
        e.preventDefault();
        alert('Enterprise DLP: Copy is blocked for CONFIDENTIAL files');
      }
    };

    const handlePrint = (e: KeyboardEvent) => {
      if (enabled.print && (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
        alert('Enterprise DLP: Printing is blocked for CONFIDENTIAL files');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (enabled.clipboard) {
        e.preventDefault();
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu as any);
    document.addEventListener('keydown', handlePrint as any);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu as any);
      document.removeEventListener('keydown', handlePrint as any);
    };
  }, [enabled]);
}
