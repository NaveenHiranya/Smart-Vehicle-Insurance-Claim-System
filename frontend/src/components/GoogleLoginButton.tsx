import { useEffect, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

// Loads the Google Identity Services script once; the promise is shared so
// multiple buttons (login + register) reuse the same script tag
let scriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null; // allow a retry on the next mount
        reject(new Error('Failed to load Google Sign-In.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  onError: (message: string) => void;
  text?: 'signin_with' | 'continue_with' | 'signup_with';
}

// Official Google Sign-In button (Google Identity Services). Renders nothing
// when VITE_GOOGLE_CLIENT_ID is not configured, so the pages degrade cleanly.
export function GoogleLoginButton({ onSuccess, onError, text = 'continue_with' }: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the latest callbacks without re-initializing the button on re-renders
  const callbacksRef = useRef({ onSuccess, onError });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response.credential) callbacksRef.current.onSuccess(response.credential);
            else callbacksRef.current.onError('Google sign-in failed. Please try again.');
          },
        });
        // Strict-mode double mounts would otherwise stack two buttons
        containerRef.current.replaceChildren();
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text,
          logo_alignment: 'center',
        });
      })
      .catch(() => callbacksRef.current.onError('Could not load Google Sign-In. Check your connection.'));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">or continue with</span>
        </div>
      </div>
      <div ref={containerRef} className="mt-4 flex w-full justify-center" />
    </div>
  );
}
