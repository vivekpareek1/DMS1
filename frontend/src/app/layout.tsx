
import Script from 'next/script';

export const metadata = {
  title: 'Vault DMS',
  description: 'Document management for architecture and construction firms',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Google Identity Services - used by the signup/login pages for Google Sign-In. */}
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
