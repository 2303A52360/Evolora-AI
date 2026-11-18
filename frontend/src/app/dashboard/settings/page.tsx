"use client";

import { useState, useEffect } from "react";
import { User, Bell, Shield, Key, Eye, EyeOff } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  
  const [openaiKey, setOpenaiKey] = useState("");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [showOpenai, setShowOpenai] = useState(false);
  const [showNvidia, setShowNvidia] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setOpenaiKey(localStorage.getItem("OPENAI_API_KEY") || "");
    setNvidiaKey(localStorage.getItem("NVIDIA_API_KEY") || "");
  }, []);

  const saveKeys = () => {
    localStorage.setItem("OPENAI_API_KEY", openaiKey);
    localStorage.setItem("NVIDIA_API_KEY", nvidiaKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-[520px] space-y-8">
        {/* Profile */}
        <section>
          <h3 className="text-heading flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[var(--color-ink-tertiary)]" />
            Profile
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-label block mb-1.5">Name</label>
              <input
                type="text"
                defaultValue={user?.name || ""}
                className="input"
                disabled
              />
            </div>
            <div>
              <label className="text-label block mb-1.5">Email</label>
              <input
                type="email"
                defaultValue={user?.email || ""}
                className="input"
                disabled
              />
            </div>
            <div>
              <label className="text-label block mb-1.5">Plan</label>
              <div className="flex items-center gap-3">
                <span className="tag-accent text-[11px] capitalize">
                  {user?.plan || "free"}
                </span>
                <span className="text-caption">
                  {user?.plan === "pro" ? "All features unlocked" : "Upgrade for unlimited access"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* API Keys */}
        <section>
          <h3 className="text-heading flex items-center gap-2 mb-1">
            <Key className="w-4 h-4 text-[var(--color-ink-tertiary)]" />
            API Keys (Bring Your Own Key)
          </h3>
          <p className="text-body-sm mb-4">
            If you hit the free tier rate limits, you can provide your own API keys. Keys are stored locally in your browser.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-label block mb-1.5">OpenAI API Key (For Audio/TTS/Evaluations)</label>
              <div className="relative">
                <input
                  type={showOpenai ? "text" : "password"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)]"
                >
                  {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-label block mb-1.5">NVIDIA NIM API Key (For High-Speed LLM Inference)</label>
              <div className="relative">
                <input
                  type={showNvidia ? "text" : "password"}
                  value={nvidiaKey}
                  onChange={(e) => setNvidiaKey(e.target.value)}
                  placeholder="nvapi-..."
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNvidia(!showNvidia)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)]"
                >
                  {showNvidia ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <button onClick={saveKeys} className="btn-primary mt-2">
              {saved ? "Saved successfully!" : "Save API Keys"}
            </button>
          </div>
        </section>

        <hr className="divider" />

        {/* Notifications */}
        <section>
          <h3 className="text-heading flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-[var(--color-ink-tertiary)]" />
            Notifications
          </h3>
          <div className="space-y-4">
            {[
              { label: "Email notifications", desc: "Get notified when assessments are ready" },
              { label: "Weekly progress report", desc: "Summary of your preparation activity" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-ink-primary)]">{item.label}</p>
                  <p className="text-caption">{item.desc}</p>
                </div>
                <button className="w-9 h-[22px] rounded-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] relative transition-colors">
                  <span className="absolute left-[3px] top-[3px] w-[14px] h-[14px] rounded-full bg-[var(--color-ink-tertiary)] transition-all" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* Account */}
        <section>
          <h3 className="text-heading flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[var(--color-ink-tertiary)]" />
            Account
          </h3>
          <p className="text-body-sm mb-3">
            Sign out of your account on this device.
          </p>
          <button onClick={logout} className="btn-danger text-[13px]">
            Sign out
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}
