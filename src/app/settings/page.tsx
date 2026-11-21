'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import {
  Settings,
  Building,
  CreditCard,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'brokerage' | 'billing' | 'notifications'>('profile');
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: 'Hamdan Al Maktoum',
    email: 'hamdan@apexluxury.ae',
    phone: '+971 50 123 4567',
    brn: 'BRN-48910',
  });

  const [brokerage, setBrokerage] = useState({
    name: 'Apex Luxury Properties Dubai',
    reraOrn: '19482',
    tradeLicense: 'CN-894721',
    address: 'Level 42, Boulevard Plaza Tower 1, Downtown Dubai, UAE',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppShell title="Account & Brokerage Settings" subtitle="Configure personal credentials, Dubai RERA licensing, and billing">
      <div className="space-y-6 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E8EAF0] pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'profile' ? 'bg-[#635BFF] text-white shadow-sm' : 'text-[#737B8C] hover:text-[#151923]'
            }`}
          >
            Broker Profile
          </button>
          <button
            onClick={() => setActiveTab('brokerage')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'brokerage' ? 'bg-[#635BFF] text-white shadow-sm' : 'text-[#737B8C] hover:text-[#151923]'
            }`}
          >
            Brokerage & RERA License
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'billing' ? 'bg-[#635BFF] text-white shadow-sm' : 'text-[#737B8C] hover:text-[#151923]'
            }`}
          >
            Billing & Invoices
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'notifications' ? 'bg-[#635BFF] text-white shadow-sm' : 'text-[#737B8C] hover:text-[#151923]'
            }`}
          >
            Notifications
          </button>
        </div>

        {saved && (
          <div className="p-3 bg-[#E7F7F0] border border-[#B7EBD4] text-[#16A36A] rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings updated successfully.</span>
          </div>
        )}

        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#151923]">Personal Broker Credentials</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Corporate Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Phone Number (WhatsApp Active)</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">RERA Broker Card (BRN)</label>
                  <input
                    type="text"
                    value={profile.brn}
                    onChange={(e) => setProfile({ ...profile, brn: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Brokerage */}
        {activeTab === 'brokerage' && (
          <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#151923]">Registered Brokerage & Licensing</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Agency Name</label>
                  <input
                    type="text"
                    value={brokerage.name}
                    onChange={(e) => setBrokerage({ ...brokerage, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">RERA ORN (Office Reg Number)</label>
                  <input
                    type="text"
                    value={brokerage.reraOrn}
                    onChange={(e) => setBrokerage({ ...brokerage, reraOrn: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Commercial Trade License</label>
                  <input
                    type="text"
                    value={brokerage.tradeLicense}
                    onChange={(e) => setBrokerage({ ...brokerage, tradeLicense: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Dubai Office Address</label>
                  <input
                    type="text"
                    value={brokerage.address}
                    onChange={(e) => setBrokerage({ ...brokerage, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] text-white"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Brokerage</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Billing */}
        {activeTab === 'billing' && (
          <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E8EAF0] pb-4">
              <div>
                <span className="text-xs font-semibold text-[#635BFF] uppercase tracking-wider">Current Subscription</span>
                <h3 className="text-lg font-bold text-[#151923]">Admatrix Property Enterprise</h3>
                <p className="text-xs text-[#737B8C]">Unlimited Trakheesi validations, AI ad generations, and WhatsApp automation.</p>
              </div>
              <Badge variant="success">Active Plan</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0]">
                <span className="text-[11px] text-[#737B8C] block mb-1">Billing Rate</span>
                <span className="text-xl font-bold text-[#151923]">AED 2,499 / month</span>
              </div>
              <div className="p-4 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0]">
                <span className="text-[11px] text-[#737B8C] block mb-1">Payment Method</span>
                <span className="text-sm font-semibold text-[#151923] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#635BFF]" />
                  •••• •••• •••• 8912 (Visa)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#151923]">Automated Real-Time Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0] cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[#151923]">Instant WhatsApp Alert on Inbound Lead</div>
                  <div className="text-[11px] text-[#737B8C]">Notify assigned broker on WhatsApp immediately upon lead capture.</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 text-[#635BFF] rounded" />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0] cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[#151923]">Trakheesi Expiry Warning (14-day alert)</div>
                  <div className="text-[11px] text-[#737B8C]">Send renewal reminders before permits expire to avoid ad campaign suspension.</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 text-[#635BFF] rounded" />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0] cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[#151923]">Weekly ROI & Performance Email Report</div>
                  <div className="text-[11px] text-[#737B8C]">Automated digest of total spend, CPL, and lead conversion rates.</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 text-[#635BFF] rounded" />
              </label>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
