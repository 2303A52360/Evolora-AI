"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Code2,
  Mic,
  Bookmark,
  TrendingUp,
  HelpCircle,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  Moon,
  Sun,
} from "lucide-react";

/* ── Navigation config ──────────────────────────────────────────────── */

const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "MCQ Exam", href: "/dashboard/mcq", icon: ClipboardCheck },
  { label: "Coding IDE", href: "/dashboard/coding", icon: Code2 },
  { label: "Voice Interview", href: "/dashboard/interviews", icon: Mic },
  { label: "Preparation", href: "/dashboard/preparation", icon: Bookmark },
  { label: "Saved Jobs", href: "/dashboard/jobs", icon: Bookmark },
  { label: "Flashcards", href: "/dashboard/flashcards", icon: BookOpen },
  { label: "Resume Builder", href: "/dashboard/resume", icon: FileText },
  { label: "Progress", href: "/dashboard/progress", icon: TrendingUp },
];

const utilityNav = [
  { label: "Help", href: "/dashboard/help", icon: HelpCircle },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════════ */

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "EV";

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 bottom-0 w-[220px] bg-[var(--color-surface)]
          border-r border-[var(--color-border-default)] flex flex-col z-50
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-[52px] px-4 border-b border-[var(--color-border-default)]">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">E</span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-[var(--color-ink-primary)]">
              Evolora
            </span>
          </Link>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-ink-tertiary)] lg:hidden hover:text-[var(--color-ink-primary)]"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
          {mainNav.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`
                  flex items-center gap-2.5 px-2.5 py-[7px] rounded-[var(--radius-md)] text-[13px]
                  transition-colors duration-100
                  ${
                    active
                      ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] font-semibold"
                      : "text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-sunken)]"
                  }
                `}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-[var(--color-accent-text)]" : "text-[var(--color-ink-tertiary)]"}`} strokeWidth={active ? 2 : 1.5} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Utility nav */}
        <div className="px-2 py-2 border-t border-[var(--color-border-default)] space-y-0.5">
          {utilityNav.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`
                  flex items-center gap-2.5 px-2.5 py-[6px] rounded-[var(--radius-md)] text-[12px]
                  transition-colors duration-100
                  ${active ? "text-[var(--color-accent-text)] font-medium" : "text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-secondary)]"}
                `}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User */}
        <div className="px-3 py-3 border-t border-[var(--color-border-default)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center text-[10px] font-semibold text-[var(--color-ink-secondary)] flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[var(--color-ink-primary)] truncate">
                {user?.name || "Candidate"}
              </p>
              <p className="text-[11px] text-[var(--color-ink-tertiary)] truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-2 px-2.5 py-[5px] rounded-[var(--radius-md)] text-[12px]
              text-[var(--color-ink-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)]
              transition-colors duration-100 w-full"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TOP BAR
   ═══════════════════════════════════════════════════════════════════ */

function TopBar({ title, subtitle, onMenu, theme, toggleTheme }: { title: string; subtitle?: string; onMenu: () => void; theme: string; toggleTheme: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border-default)]">
      <div className="flex items-center justify-between h-[52px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            onClick={onMenu}
            className="p-1.5 -ml-1.5 rounded-[var(--radius-md)] text-[var(--color-ink-tertiary)] hover:bg-[var(--color-surface-sunken)] lg:hidden mr-3"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-[var(--color-ink-primary)]">
              {title}
            </h1>
            {subtitle && (
              <span className="text-[12px] text-[var(--color-ink-tertiary)] hidden sm:inline">
                — {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-[var(--radius-md)] text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-sunken)] transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT WRAPPER
   ═══════════════════════════════════════════════════════════════════ */

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

export default function DashboardLayout({ title, subtitle, children, wide }: DashboardLayoutProps) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Load theme from local storage on mount
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink-primary)]">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="lg:pl-[220px] flex flex-col min-h-screen">
          <TopBar title={title} subtitle={subtitle} onMenu={() => setOpen(true)} theme={theme} toggleTheme={toggleTheme} />
          <main className={`flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full ${wide ? "" : "max-w-6xl mx-auto"}`}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
