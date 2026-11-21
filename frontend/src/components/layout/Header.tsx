'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  HelpCircle,
  Plus,
  Sparkles,
  ChevronDown,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export function Header({ title = 'Dashboard', subtitle }: HeaderProps) {
  const router = useRouter();
  const [role, setRole] = useState<'BROKERAGE_ADMIN' | 'INDIVIDUAL_BROKER' | 'BROKER_AGENT' | 'SUPER_ADMIN'>('BROKERAGE_ADMIN');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    {
      id: 1,
      title: 'New High-Value Lead Captured',
      desc: 'Tariq Mansoor inquired on Palm Jumeirah Signature Villa via Meta Ad',
      time: '12m ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Trakheesi Permit Verification',
      desc: 'Marina Gate II permit expired. Renewal required before ads can be resumed.',
      time: '1h ago',
      unread: true,
      alert: true,
    },
    {
      id: 3,
      title: 'Google Campaign Activated',
      desc: 'Il Primo Duplex Penthouse campaign is now live and driving impressions.',
      time: '3h ago',
      unread: false,
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/properties?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E8EAF0] sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Title / Breadcrumb */}
      <div className="flex flex-col">
        <h1 className="text-base font-semibold text-[#151923] tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-[#737B8C]">{subtitle}</p>}
      </div>

      {/* Center Global Search */}
      <div className="flex-1 max-w-md mx-8">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-[#737B8C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search properties, permits, leads, or campaigns (Press Enter)..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#635BFF] focus:bg-white text-[#151923] placeholder-[#737B8C] transition-all"
          />
        </form>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#F7F8FA] border border-[#E8EAF0] hover:bg-[#F0EFFF] hover:text-[#635BFF] transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#635BFF]" />
            <span>
              {role === 'BROKERAGE_ADMIN' && 'Brokerage Admin'}
              {role === 'INDIVIDUAL_BROKER' && 'Individual Broker'}
              {role === 'BROKER_AGENT' && 'Agent'}
              {role === 'SUPER_ADMIN' && 'Platform Admin'}
            </span>
            <ChevronDown className="w-3 h-3 text-[#737B8C]" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#E8EAF0] py-1.5 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#737B8C] tracking-wider">
                Simulate User Role
              </div>
              <button
                onClick={() => { setRole('BROKERAGE_ADMIN'); setShowRoleMenu(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F7F8FA] ${role === 'BROKERAGE_ADMIN' ? 'font-semibold text-[#635BFF]' : 'text-[#151923]'}`}
              >
                <span>Brokerage Admin</span>
                {role === 'BROKERAGE_ADMIN' && <CheckCircle2 className="w-3.5 h-3.5 text-[#635BFF]" />}
              </button>
              <button
                onClick={() => { setRole('INDIVIDUAL_BROKER'); setShowRoleMenu(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F7F8FA] ${role === 'INDIVIDUAL_BROKER' ? 'font-semibold text-[#635BFF]' : 'text-[#151923]'}`}
              >
                <span>Individual Broker</span>
                {role === 'INDIVIDUAL_BROKER' && <CheckCircle2 className="w-3.5 h-3.5 text-[#635BFF]" />}
              </button>
              <button
                onClick={() => { setRole('BROKER_AGENT'); setShowRoleMenu(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F7F8FA] ${role === 'BROKER_AGENT' ? 'font-semibold text-[#635BFF]' : 'text-[#151923]'}`}
              >
                <span>Broker / Agent</span>
                {role === 'BROKER_AGENT' && <CheckCircle2 className="w-3.5 h-3.5 text-[#635BFF]" />}
              </button>
              <button
                onClick={() => { setRole('SUPER_ADMIN'); setShowRoleMenu(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F7F8FA] ${role === 'SUPER_ADMIN' ? 'font-semibold text-[#635BFF]' : 'text-[#151923]'}`}
              >
                <span>Platform Super Admin</span>
                {role === 'SUPER_ADMIN' && <CheckCircle2 className="w-3.5 h-3.5 text-[#635BFF]" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#737B8C] hover:bg-[#F7F8FA] hover:text-[#151923] relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-[#E05252] absolute top-1.5 right-1.5" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#E8EAF0] py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-[#E8EAF0] flex items-center justify-between">
                <span className="font-semibold text-[#151923]">Notifications</span>
                <span className="text-[10px] bg-[#F0EFFF] text-[#635BFF] font-semibold px-2 py-0.5 rounded-full">2 New</span>
              </div>
              <div className="divide-y divide-[#E8EAF0] max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-[#F7F8FA] transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className={`font-medium ${n.alert ? 'text-[#E05252]' : 'text-[#151923]'}`}>{n.title}</span>
                      <span className="text-[10px] text-[#737B8C] shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#737B8C] leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Launch Actions */}
        <Link
          href="/properties/new"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E8EAF0] text-[#151923] hover:bg-[#F7F8FA] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Property</span>
        </Link>

        <Link
          href="/ad-studio"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>Create Ad</span>
        </Link>
      </div>
    </header>
  );
}

