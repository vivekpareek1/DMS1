
'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
}

/**
 * Renders Google's own Sign-In button via the Google Identity Services script
 * (loaded in app/layout.tsx). On success, hands the raw ID token up to the
 * caller - verification happens server-side (GoogleAuthService), never here.
 */
export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
      return;
    }

    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        // GSI script (loaded via next/script in layout.tsx) may not have
        // executed yet - retry briefly rather than failing silently.
        setTimeout(tryInit, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => onCredential(response.credential),
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
        });
      }
    };
    tryInit();
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  return <div ref={buttonRef} />;
}
