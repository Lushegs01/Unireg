import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "UniReg — University Registration System",
    template: "%s | UniReg",
  },
  description:
    "Secure departmental online registration system for university students and administrators.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "font-body text-sm border border-border bg-card text-card-foreground shadow-lg",
              title: "font-medium",
              description: "text-muted-foreground",
              actionButton: "bg-primary text-primary-foreground",
              cancelButton: "bg-muted text-muted-foreground",
              error: "border-destructive/30 bg-destructive/5",
              success: "border-green-200 bg-green-50",
              warning: "border-yellow-200 bg-yellow-50",
            },
          }}
        />
      </body>
    </html>
  );
}
