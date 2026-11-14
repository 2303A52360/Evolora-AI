"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--color-border-default)]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">E</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink-primary)]">
              Evolora
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link href="/register" className="btn-primary text-[13px] py-2 px-4">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button
            id="mobile-menu-toggle"
            className="md:hidden text-[var(--color-ink-secondary)] p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-[var(--color-border-default)]">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block py-2.5 text-[14px] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 pt-3 border-t border-[var(--color-border-default)] flex flex-col gap-2">
              <Link href="/login" className="text-[14px] text-center py-2 text-[var(--color-ink-secondary)]">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary justify-center text-[14px] py-2.5">
                Get started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
