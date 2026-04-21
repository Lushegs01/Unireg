import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { GraduationCap, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your university registration portal.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 uni-gradient" />
      <div className="absolute inset-0 paper-texture opacity-30" />

      {/* Decorative orbs */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, hsl(42 90% 55%) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-48 -left-32 w-80 h-80 rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, hsl(200 80% 60%) 0%, transparent 70%)",
        }}
      />

      {/* Main card */}
      <div className="relative w-full max-w-md mx-4 animate-fade-in-1">
        <div className="glass rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-white/30">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl uni-gradient flex items-center justify-center shadow-lg shadow-black/20">
                <GraduationCap className="w-8 h-8 text-amber-300" />
              </div>
            </div>
            <h1 className="text-2xl font-display text-slate-900 mb-1">
              Student Portal
            </h1>
            <p className="text-sm text-slate-500">
              University Departmental Registration System
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <LoginForm />
          </div>

          {/* Footer note */}
          <div className="px-8 pb-6">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50/80 border border-blue-200/60 p-3">
              <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Access is restricted to institutional{" "}
                <strong>.edu</strong> email addresses. Contact your
                department administrator if you need assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom label */}
        <p className="text-center text-white/50 text-xs mt-4">
          © {new Date().getFullYear()} University Registration System. All rights reserved.
        </p>
      </div>
    </main>
  );
}
