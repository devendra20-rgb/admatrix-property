'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ComplianceBadge } from '@/components/properties/ComplianceBadge';
import { Badge } from '@/components/ui/Badge';
import {
  Building2,
  Megaphone,
  Users2,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShieldCheck,
  Plus,
  ChevronRight,
  MessageCircle,
  ExternalLink,
  Target,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [propsRes, campsRes, leadsRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/campaigns'),
          fetch('/api/leads'),
        ]);

        const [propsData, campsData, leadsData] = await Promise.all([
          propsRes.json(),
          campsRes.json(),
          leadsRes.json(),
        ]);

        if (propsData.data) setProperties(propsData.data);
        if (campsData.data) setCampaigns(campsData.data);
        if (leadsData.data) setLeads(leadsData.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Calculate Metrics
  const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
  const totalLeads = leads.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const compliantProperties = properties.filter((p) => p.complianceStatus === 'COMPLIANT').length;
  const avgCPL = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0';

  // Realistic Dubai Ads performance chart data
  const performanceData = [
    { day: 'Mon', spend: 950, leads: 8, impressions: 9200 },
    { day: 'Tue', spend: 1100, leads: 11, impressions: 11400 },
    { day: 'Wed', spend: 1350, leads: 14, impressions: 13800 },
    { day: 'Thu', spend: 1200, leads: 12, impressions: 12600 },
    { day: 'Fri', spend: 1600, leads: 18, impressions: 17200 },
    { day: 'Sat', spend: 1850, leads: 22, impressions: 19800 },
    { day: 'Sun', spend: 1400, leads: 16, impressions: 14500 },
  ];

  return (
    <AppShell title="Executive Overview" subtitle="Real-time Dubai real estate marketing performance & compliance summary">
      <div className="space-y-6">
        {/* Compliance Alert Banner */}
        <div className="bg-gradient-to-r from-[#635BFF]/10 via-[#F0EFFF] to-[#E7F7F0] border border-[#635BFF]/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#635BFF] shrink-0 border border-[#E8EAF0]">
              <ShieldCheck className="w-5 h-5 text-[#635BFF]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#151923] flex items-center gap-2">
                Dubai Land Department (DLD) Trakheesi Compliance Engine
                <Badge variant="success" size="sm">Active Guard</Badge>
              </div>
              <p className="text-xs text-[#737B8C]">
                {compliantProperties} of {properties.length} listings are 100% compliant with active Madmoun QR codes and Form A authorization.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/properties/new"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#635BFF] text-white hover:bg-[#5248E2] transition-colors shadow-sm"
            >
              + Add Property
            </Link>
            <Link
              href="/ad-studio"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E8EAF0] text-[#151923] hover:bg-[#F7F8FA] transition-colors"
            >
              Generate AI Creatives
            </Link>
          </div>
        </div>

        {/* 6 Key KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* 1. Active Listings */}
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card hover:border-[#D5D1FF] transition-all">
            <div className="flex items-center justify-between text-[#737B8C] mb-2">
              <span className="text-xs font-medium">Total Listings</span>
              <Building2 className="w-4 h-4 text-[#635BFF]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">{properties.length}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#16A36A]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{compliantProperties} Compliant</span>
            </div>
          </div>

          {/* 2. Active Campaigns */}
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card hover:border-[#D5D1FF] transition-all">
            <div className="flex items-center justify-between text-[#737B8C] mb-2">
              <span className="text-xs font-medium">Active Ads</span>
              <Megaphone className="w-4 h-4 text-[#8B7CFF]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">{activeCampaigns}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#737B8C]">
              <span>Meta & Google Ads</span>
            </div>
          </div>

          {/* 3. Total Ad Spend */}
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card hover:border-[#D5D1FF] transition-all">
            <div className="flex items-center justify-between text-[#737B8C] mb-2">
              <span className="text-xs font-medium">Total Spend</span>
              <DollarSign className="w-4 h-4 text-[#16A36A]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">
              AED {totalSpend.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#16A36A]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% this week</span>
            </div>
          </div>

          {/* 4. Total Leads */}
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card hover:border-[#D5D1FF] transition-all">
            <div className="flex items-center justify-between text-[#737B8C] mb-2">
              <span className="text-xs font-medium">Total Leads</span>
              <Users2 className="w-4 h-4 text-[#E5A12B]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">{totalLeads}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#16A36A]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>4 new today</span>
            </div>
          </div>

          {/* 5. Avg Cost Per Lead */}
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card hover:border-[#D5D1FF] transition-all">
            <div className="flex items-center justify-between text-[#737B8C] mb-2">
              <span className="text-xs font-medium">Avg CPL</span>
              <Target className="w-4 h-4 text-[#635BFF]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">AED {avgCPL}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#16A36A]">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>-12% vs market avg</span>
            </div>
          </div>

          {/* 6. Lead Conversion */}
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card hover:border-[#D5D1FF] transition-all">
            <div className="flex items-center justify-between text-[#737B8C] mb-2">
              <span className="text-xs font-medium">Qualified Rate</span>
              <TrendingUp className="w-4 h-4 text-[#16A36A]" />
            </div>
            <div className="text-2xl font-bold text-[#151923]">68.5%</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#737B8C]">
              <span>WhatsApp Inbounds</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trend Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8EAF0] shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#151923]">Campaign Spend vs. Lead Velocity</h3>
                <p className="text-xs text-[#737B8C]">Daily aggregated ad spend (AED) and verified inquiry volume</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-[#737B8C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#635BFF]" /> Spend (AED)
                </span>
                <span className="flex items-center gap-1 text-xs text-[#737B8C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A36A]" /> Leads
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#635BFF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#635BFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F5" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737B8C' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737B8C' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737B8C' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E8EAF0', fontSize: '12px' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="spend" stroke="#635BFF" strokeWidth={2} fillOpacity={1} fill="url(#spendGrad)" name="Spend (AED)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Compliance & Action Panel */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF0] shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#151923]">Trakheesi Guard Status</h3>
                <Badge variant="primary" size="sm">Real-Time</Badge>
              </div>
              <p className="text-xs text-[#737B8C] mb-4">
                Regulatory policy blocks ad launches on Meta & Google if permits are expired or Form A is absent.
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E8EAF0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#16A36A]" />
                    <span className="text-xs font-medium text-[#151923]">Compliant Listings</span>
                  </div>
                  <span className="text-xs font-bold text-[#16A36A]">{compliantProperties}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E8EAF0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E05252]" />
                    <span className="text-xs font-medium text-[#151923]">Expired Permits (Blocked)</span>
                  </div>
                  <span className="text-xs font-bold text-[#E05252]">
                    {properties.filter((p) => p.complianceStatus === 'EXPIRED').length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E8EAF0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E5A12B]" />
                    <span className="text-xs font-medium text-[#151923]">Action Required</span>
                  </div>
                  <span className="text-xs font-bold text-[#D97706]">
                    {properties.filter((p) => p.complianceStatus === 'ACTION_REQUIRED').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8EAF0]">
              <Link
                href="/properties"
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-[#F7F8FA] hover:bg-[#F0EFFF] text-[#635BFF] transition-colors"
              >
                Review Compliance Table <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Two-Column Tables: Recent Campaigns & Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Campaigns */}
          <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card overflow-hidden">
            <div className="p-4 border-b border-[#E8EAF0] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#151923]">Active Ad Campaigns</h3>
                <p className="text-xs text-[#737B8C]">Meta & Google automated distribution</p>
              </div>
              <Link href="/campaigns" className="text-xs font-medium text-[#635BFF] hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#E8EAF0]">
              {campaigns.slice(0, 4).map((c) => (
                <div key={c.id} className="p-4 hover:bg-[#F7F8FA] transition-colors flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#151923] truncate">{c.name}</span>
                      <Badge variant={c.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                        {c.status}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {c.platform}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-[#737B8C] flex items-center gap-3">
                      <span>Budget: AED {c.budgetAmount}/day</span>
                      <span>Spend: AED {c.spend || 0}</span>
                      <span className="font-semibold text-[#151923]">{c.leadsCount || 0} Leads</span>
                    </div>
                  </div>
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="p-1.5 rounded-lg border border-[#E8EAF0] hover:bg-white text-[#737B8C] hover:text-[#151923] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card overflow-hidden">
            <div className="p-4 border-b border-[#E8EAF0] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#151923]">Recent Inbound Leads</h3>
                <p className="text-xs text-[#737B8C]">Qualified buyer inquiries with WhatsApp sync</p>
              </div>
              <Link href="/leads" className="text-xs font-medium text-[#635BFF] hover:underline flex items-center gap-1">
                Open CRM Inbox <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#E8EAF0]">
              {leads.slice(0, 4).map((l) => (
                <div key={l.id} className="p-4 hover:bg-[#F7F8FA] transition-colors flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#151923] truncate">{l.name}</span>
                      <Badge
                        variant={
                          l.status === 'QUALIFIED' ? 'success' : l.status === 'NEW' ? 'primary' : 'neutral'
                        }
                        size="sm"
                      >
                        {l.status}
                      </Badge>
                      <span className="text-[10px] text-[#737B8C] font-mono">{l.phone}</span>
                    </div>
                    <p className="text-[11px] text-[#737B8C] truncate">
                      {l.property?.title || 'General Dubai Inquiry'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/leads`}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#E7F7F0] text-[#16A36A] hover:bg-[#D4F3E4] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

