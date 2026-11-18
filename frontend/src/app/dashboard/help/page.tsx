"use client";

import { HelpCircle, BookOpen, MessageSquare, Mail, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function HelpPage() {
  const faqs = [
    {
      q: "How does job analysis work?",
      a: "Paste a job description and our AI extracts required skills, seniority level, technologies, and responsibilities. This analysis personalizes all your preparation content.",
    },
    {
      q: "How are questions generated?",
      a: "Questions are generated based on the specific skills and technologies extracted from your target job. They cover MCQs, short-answer, and coding challenges at varying difficulty levels.",
    },
    {
      q: "Can I prepare for multiple jobs?",
      a: "Yes. You can save multiple job targets and switch between them. Each job gets its own personalized preparation plan and progress tracking.",
    },
    {
      q: "How is my progress tracked?",
      a: "Your progress is tracked per skill area. We measure topics completed, assessment scores, and practice consistency to show your improvement over time.",
    },
  ];

  return (
    <DashboardLayout title="Help">
      <div className="max-w-[560px]">
        <p className="text-body-sm mb-8">
          Find answers to common questions or reach out if you need assistance.
        </p>

        {/* Quick links */}
        <section className="mb-8">
          <h3 className="text-heading mb-3">Quick links</h3>
          <div className="space-y-1">
            {[
              { icon: <BookOpen className="w-4 h-4" />, label: "Getting started guide", desc: "Learn how to use Evolora" },
              { icon: <MessageSquare className="w-4 h-4" />, label: "Feature requests", desc: "Suggest improvements" },
              { icon: <Mail className="w-4 h-4" />, label: "Contact support", desc: "support@evolora.app" },
            ].map((link) => (
              <button
                key={link.label}
                className="flex items-center gap-3 w-full p-3 rounded-[var(--radius-lg)] hover:bg-[var(--color-surface)] transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] flex items-center justify-center text-[var(--color-ink-secondary)] flex-shrink-0">
                  {link.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[var(--color-ink-primary)]">{link.label}</p>
                  <p className="text-[11px] text-[var(--color-ink-tertiary)]">{link.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-ink-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </section>

        <hr className="divider mb-8" />

        {/* FAQs */}
        <section>
          <h3 className="text-heading mb-4">Frequently asked questions</h3>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i}>
                <p className="text-[13px] font-medium text-[var(--color-ink-primary)] mb-1">{faq.q}</p>
                <p className="text-body-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
