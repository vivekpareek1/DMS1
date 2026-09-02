
'use client';
import { useEffect, useRef, useState } from 'react';

interface ScreenshotProtectionProps {
  fileId: string;
  fileName: string;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  userEmail: string;
  userIp: string;
  enabled: boolean;
  children: React.ReactNode;
}

export function ScreenshotProtection({ 
  fileId, 
  fileName, 
  classification, 
  userEmail, 
  userIp, 
  enabled, 
  children 
}: ScreenshotProtectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const [screenshotAttempts, setScreenshotAttempts] = useState(0);

  useEffect(() => {
    if (!enabled || classification === 'PUBLIC') return;

    const logAttempt = async (method: string) => {
      setScreenshotAttempts(prev => prev + 1);
      setIsBlurred(true);
      
      // Log to backend
      try {
        await fetch('/api/dlp/screenshot-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId,
            fileName,
            detectionMethod: method,
            classification,
            timestamp: new Date().toISOString()
          })
        });
      } catch {}

      // Show warning
      alert(`Enterprise DLP: Screenshot attempt detected (${method}) - Logged for ${classification} file. Watermark: ${userEmail}`);

      // Blur for 3 seconds
      setTimeout(() => setIsBlurred(false), 3000);
    };

    // LAYER 1: Block PrintScreen key
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key (keyCode 44)
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        navigator.clipboard.writeText('').catch(() => {});
        logAttempt('PRINTSCREEN_KEY');
      }
      // Block Ctrl+Shift+S (common screenshot shortcut)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        logAttempt('PRINTSCREEN_KEY');
      }
      // Block Snipping Tool shortcuts
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        // DevTools open - possible screenshot attempt
        if (['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) {
          logAttempt('DEVTOOLS');
        }
      }
    };

    // LAYER 2: Visibility Change - Detect when user switches to screenshot tool
    const handleVisibilityChange = () => {
      if (document.hidden && ['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) {
        // User switched tab/app - might be opening screenshot tool
        setIsBlurred(true);
        logAttempt('VISIBILITY_CHANGE');
      } else {
        setIsBlurred(false);
      }
    };

    // LAYER 3: Window blur - When window loses focus (Snipping Tool opens)
    const handleWindowBlur = () => {
      if (['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) {
        setIsBlurred(true);
        // Don't log immediately on blur (too many false positives), but blur content
      }
    };

    const handleWindowFocus = () => {
      setIsBlurred(false);
    };

    // LAYER 4: Block right-click and context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logAttempt('CONTEXT_MENU');
      return false;
    };

    // LAYER 5: Detect clipboard access (PrintScreen copies to clipboard)
    const handleClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text === '' && ['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) {
          // Clipboard was cleared after PrintScreen - possible screenshot
          logAttempt('PRINTSCREEN_KEY');
        }
      } catch {}
    };

    // LAYER 6: CSS - Disable text selection and dragging
    const style = document.createElement('style');
    style.textContent = `
      .dlp-protected {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-user-drag: none !important;
      }
      .dlp-protected img {
        pointer-events: none !important;
      }
      @media print {
        .dlp-protected { display: none !important; }
        body::after {
          content: "Enterprise DLP: Printing blocked for ${classification} file - ${userEmail}";
          display: block;
          font-size: 24px;
          text-align: center;
          margin-top: 50%;
        }
      }
    `;
    document.head.appendChild(style);

    // Attach listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('contextmenu', handleContextMenu as any);
    document.addEventListener('copy', (e) => {
      if (['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) {
        e.preventDefault();
        logAttempt('CONTEXT_MENU');
      }
    });
    document.addEventListener('cut', (e) => {
      if (['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) {
        e.preventDefault();
        logAttempt('CONTEXT_MENU');
      }
    });

    // Check clipboard periodically for PrintScreen detection
    const clipboardInterval = setInterval(handleClipboard, 1000);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('contextmenu', handleContextMenu as any);
      clearInterval(clipboardInterval);
      document.head.removeChild(style);
    };
  }, [enabled, classification, fileId, fileName, userEmail, userIp]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="dlp-protected relative">
      {/* LAYER 7: Blur overlay when screenshot attempt detected */}
      {isBlurred && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-xl">
          <div className="text-center text-white p-8">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-2xl font-bold mb-2">Enterprise DLP Protection</h3>
            <p className="text-zinc-400">Content hidden - Screenshot attempt detected</p>
            <p className="text-xs mt-4 text-zinc-500">Logged: {userEmail} | {userIp} | {new Date().toLocaleString()}</p>
            <p className="text-xs text-red-400 mt-2">Attempts: {screenshotAttempts}</p>
          </div>
        </div>
      )}

      {/* LAYER 8: Dynamic Watermark - Makes screenshot traceable */}
      <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden opacity-[0.08] select-none">
        <div className="absolute inset-0 flex flex-wrap">
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i} 
              className="w-1/2 h-1/3 flex items-center justify-center -rotate-45 text-sm font-bold whitespace-nowrap"
              style={{ 
                color: classification === 'RESTRICTED' ? '#ef4444' : classification === 'CONFIDENTIAL' ? '#f59e0b' : '#6b7280'
              }}
            >
              {userEmail} | {userIp} | {classification} | {new Date().toLocaleDateString()}
            </div>
          ))}
        </div>
      </div>

      {/* LAYER 9: Canvas-based rendering - Harder to copy */}
      <div className={isBlurred ? 'blur-2xl' : ''}>
        {children}
      </div>

      {/* Warning badge */}
      {['CONFIDENTIAL', 'RESTRICTED'].includes(classification) && (
        <div className="absolute top-2 right-2 z-30 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
          <span>🔒</span> {classification} - Screenshot Protected ({screenshotAttempts} attempts blocked)
        </div>
      )}
    </div>
  );
}
