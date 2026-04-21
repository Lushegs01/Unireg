"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth";
import type { Profile } from "@/lib/supabase/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  profile: (Profile & { departments?: { name: string; code: string } | null }) | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "My Registrations", href: "/dashboard/student", icon: LayoutDashboard },
  { label: "Admin Panel", href: "/dashboard/admin", icon: Shield, adminOnly: true },
  { label: "Form Templates", href: "/dashboard/admin/templates", icon: FileText, adminOnly: true },
];

export default function Sidebar({ profile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const dept = profile?.departments as { name: string; code: string } | null | undefined;

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "relative flex flex-col h-full sidebar-gradient text-white transition-all duration-300 ease-in-out shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-amber-300" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-display font-medium text-white truncate leading-tight">
                UniReg
              </p>
              <p className="text-xs text-white/40 truncate">Registration Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard/student" && pathname.startsWith(item.href));

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/8"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-amber-300" : "text-white/50 group-hover:text-white/80"
                  )}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Divider + dept info */}
        {!collapsed && dept && (
          <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/40 mb-0.5">Department</p>
            <p className="text-xs text-white/80 font-medium truncate">{dept.name}</p>
          </div>
        )}

        {/* User section */}
        <div className="border-t border-white/10 p-2">
          <div
            className={cn(
              "flex items-center gap-2.5 px-2 py-2 rounded-lg",
              collapsed ? "justify-center" : ""
            )}
          >
            <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-amber-300">
                {getInitials(profile?.full_name)}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/90 truncate">
                  {profile?.full_name ?? "Unknown User"}
                </p>
                <p className="text-xs text-white/40 truncate capitalize">
                  {profile?.role ?? "student"}
                </p>
              </div>
            )}
          </div>

          <div className={cn("mt-1 space-y-0.5", collapsed && "flex flex-col items-center")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => logoutAction()}
                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => logoutAction()}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/8 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-slate-600 transition-all shadow-lg z-10"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
