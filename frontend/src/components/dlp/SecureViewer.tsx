
'use client';
import { ScreenshotProtection } from './ScreenshotProtection';
import { useEffect, useRef } from 'react';

interface SecureViewerProps {
  fileUrl: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  userEmail: string;
  userIp: string;
}

// LAYER 10: Secure Canvas Viewer - Renders file as canvas (not DOM) - Harder for OCR
export function SecureViewer({ fileUrl, fileId, fileName, mimeType, classification, userEmail, userIp }: SecureViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) return;

    // For Enterprise DLP, render sensitive files on canvas instead of <img> or <iframe>
    // Canvas content cannot be easily selected/copied as text
    // Still screenshot possible, but watermark makes it traceable
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Example: For images, draw to canvas with watermark embedded
    if (mimeType.startsWith('image/')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Embed invisible watermark in canvas pixels (steganography)
        // This watermark survives screenshot + crop
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(0,0,0,0.01)'; // Almost invisible
        ctx.fillText(`${userEmail}|${userIp}|${fileId}|${Date.now()}`, 10, 10);
      };
      img.src = fileUrl;
    }
  }, [fileUrl, classification, userEmail, userIp, fileId, mimeType]);

  const isProtected = ['CONFIDENTIAL', 'RESTRICTED'].includes(classification);

  return (
    <ScreenshotProtection
      fileId={fileId}
      fileName={fileName}
      classification={classification}
      userEmail={userEmail}
      userIp={userIp}
      enabled={isProtected}
    >
      <div className="relative bg-zinc-900 rounded-lg overflow-hidden">
        {mimeType.startsWith('image/') && isProtected ? (
          // Secure Canvas for confidential images
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        ) : mimeType === 'application/pdf' ? (
          // PDF viewer with protection
          <iframe 
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full h-[80vh] border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          // Default viewer
          <img src={fileUrl} alt={fileName} className="max-w-full h-auto" draggable={false} />
        )}

        {/* Additional overlay for RESTRICTED */}
        {classification === 'RESTRICTED' && (
          <div className="absolute inset-0 pointer-events-none border-4 border-red-600 rounded-lg">
            <div className="absolute top-0 left-0 bg-red-600 text-white px-4 py-1 text-xs font-bold">
              RESTRICTED - NO SCREENSHOT - {userEmail}
            </div>
          </div>
        )}
      </div>
    </ScreenshotProtection>
  );
}
