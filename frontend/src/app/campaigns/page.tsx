'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { ComplianceBadge } from '@/components/properties/ComplianceBadge';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Target,
  Sparkles,
  ShieldCheck,
  Instagram,
  Globe2,
} from 'lucide-react';

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.data) {
        setCampaigns(data.data);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const toggleCampaignStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle campaign status:', err);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesPlatform = platformFilter === 'ALL' || c.platform === platformFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesPlatform && matchesStatus;
  });

  const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leadsCount || 0), 0);

  return (
    <AppShell
      title="Advertising Campaigns"
      subtitle="Manage automated Meta & Google property campaigns with compliance checks"
      requiredRoles={['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER']}
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <div className="text-xs text-[#737B8C] font-medium flex items-center justify-between mb-1">
              <span>Total Ad Spend</span>
              <DollarSign className="w-4 h-4 text-[#16A36A]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">AED {totalSpend.toLocaleString()}</div>
            <span className="text-[11px] text-[#737B8C]">Across {campaigns.length} campaigns</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <div className="text-xs text-[#737B8C] font-medium flex items-center justify-between mb-1">
              <span>Total Leads Acquired</span>
              <Target className="w-4 h-4 text-[#635BFF]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">{totalLeads}</div>
            <span className="text-[11px] text-[#16A36A] font-medium">Direct WhatsApp & CRM sync</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <div className="text-xs text-[#737B8C] font-medium flex items-center justify-between mb-1">
              <span>Avg Cost Per Lead</span>
              <TrendingUp className="w-4 h-4 text-[#8B7CFF]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">
              AED {totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0'}
            </div>
            <span className="text-[11px] text-[#16A36A] font-medium">Dubai market benchmark</span>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8EAF0] shadow-card">
          <div className="flex items-center gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#151923]"
            >
              <option value="ALL">All Platforms</option>
              <option value="META">Meta (IG / FB)</option>
              <option value="GOOGLE">Google Ads</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#151923]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
            </select>
          </div>

          <Link
            href="/campaigns/new"
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Launch New Campaign</span>
          </Link>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#737B8C]">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Megaphone className="w-8 h-8 text-[#737B8C] mx-auto opacity-50" />
              <div className="text-sm font-semibold text-[#151923]">No Campaigns Match Selection</div>
              <p className="text-xs text-[#737B8C]">Launch a new campaign using compliant property listings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8EAF0] bg-[#FAFAFC] text-[11px] font-semibold text-[#737B8C] uppercase tracking-wider">
                    <th className="py-3 px-4">Campaign Name</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Daily Budget</th>
                    <th className="py-3 px-4">Total Spend</th>
                    <th className="py-3 px-4">Leads</th>
                    <th className="py-3 px-4">Avg CPL</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAF0] text-xs">
                  {filteredCampaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F7F8FA] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#151923]">{c.name}</div>
                        <div className="text-[11px] text-[#737B8C]">
                          Property: {c.property?.title || 'Direct Marketing'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-xs text-[#151923]">
                          {c.platform === 'META' ? <Instagram className="w-3.5 h-3.5 text-[#E1306C]" /> : <Globe2 className="w-3.5 h-3.5 text-[#4285F4]" />}
                          {c.platform}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            c.status === 'ACTIVE'
                              ? 'success'
                              : c.status === 'PAUSED'
                              ? 'neutral'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#151923]">
                        {c.currency} {c.budgetAmount}/day
                      </td>
                      <td className="py-3 px-4 text-[#151923]">
                        {c.currency} {c.spend?.toLocaleString() || 0}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#16A36A]">
                        {c.leadsCount || 0}
                      </td>
                      <td className="py-3 px-4 text-[#737B8C]">
                        {c.cpl ? `AED ${c.cpl.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleCampaignStatus(c.id, c.status)}
                            className="p-1.5 rounded-lg border border-[#E8EAF0] hover:bg-white text-[#737B8C] hover:text-[#151923] transition-colors"
                            title={c.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Campaign'}
                          >
                            {c.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5 text-[#E5A12B]" /> : <Play className="w-3.5 h-3.5 text-[#16A36A]" />}
                          </button>
                          <Link
                            href={`/campaigns/${c.id}`}
                            className="p-1.5 rounded-lg border border-[#E8EAF0] hover:bg-white text-[#737B8C] hover:text-[#151923] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

