import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maintenance Desk",
  description: "A calm maintenance workspace for small landlords and tenants.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
