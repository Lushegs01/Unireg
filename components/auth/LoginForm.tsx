"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, signupAction } from "@/lib/actions/auth";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import type { LoginSchema, SignupSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const loginForm = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", fullName: "" },
  });

  const handleLogin = async (data: LoginSchema) => {
    setIsPending(true);
    try {
      const result = await loginAction(data);
      if (result?.error) {
        toast.error(result.error);
      }
    } catch {
      // redirect throws — expected
    } finally {
      setIsPending(false);
    }
  };

  const handleSignup = async (data: SignupSchema) => {
    setIsPending(true);
    try {
      const result = await signupAction(data);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
        setMode("login");
        signupForm.reset();
      }
    } finally {
      setIsPending(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    loginForm.reset();
    signupForm.reset();
    setShowPassword(false);
  };

  return (
    <div className="space-y-5">
      {/* Mode tabs */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100/80 p-1 rounded-lg">
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              "py-1.5 px-3 text-sm font-medium rounded-md transition-all duration-150",
              mode === m
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {m === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {/* Login form */}
      {mode === "login" && (
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Institutional Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              {...loginForm.register("email")}
              className={cn(
                loginForm.formState.errors.email && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {loginForm.formState.errors.email && (
              <p className="text-xs text-destructive">
                {loginForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                {...loginForm.register("password")}
                className={cn(
                  "pr-10",
                  loginForm.formState.errors.password && "border-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-xs text-destructive">
                {loginForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      )}

      {/* Signup form */}
      {mode === "signup" && (
        <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name">Full Name</Label>
            <Input
              id="signup-name"
              type="text"
              placeholder="Dr. Jane Doe"
              autoComplete="name"
              {...signupForm.register("fullName")}
              className={cn(signupForm.formState.errors.fullName && "border-destructive")}
            />
            {signupForm.formState.errors.fullName && (
              <p className="text-xs text-destructive">
                {signupForm.formState.errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Institutional Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              {...signupForm.register("email")}
              className={cn(signupForm.formState.errors.email && "border-destructive")}
            />
            {signupForm.formState.errors.email && (
              <p className="text-xs text-destructive">
                {signupForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                {...signupForm.register("password")}
                className={cn("pr-10", signupForm.formState.errors.password && "border-destructive")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {signupForm.formState.errors.password && (
              <p className="text-xs text-destructive">
                {signupForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-confirm">Confirm Password</Label>
            <Input
              id="signup-confirm"
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              {...signupForm.register("confirmPassword")}
              className={cn(signupForm.formState.errors.confirmPassword && "border-destructive")}
            />
            {signupForm.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {signupForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {isPending ? "Creating account…" : "Create Account"}
          </Button>
        </form>
      )}
    </div>
  );
}
