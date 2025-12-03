import type { Metadata } from "next";
import AuthProvider from "@/context/AuthContext";
import RealtimeProvider from "@/components/RealtimeProvider";
import { ToastContainer } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini ERP",
  description: "Système de gestion ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <RealtimeProvider>
            {children}
            <ToastContainer />
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

