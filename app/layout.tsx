import { Analytics } from '@vercel/analytics/next';

export const metadata = { title: "Clearlot", description: "HardwareHQ intent tape" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui", background: "#0b0d10", color: "#e8eaed" }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
