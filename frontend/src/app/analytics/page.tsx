'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users2,
  Target,
  Download,
  Calendar,
  Instagram,
  Globe2,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30D');

  const trendData = [
    { date: 'Nov 1', spend: 850, leads: 6, cpl: 141.6 },
    { date: 'Nov 5', spend: 1100, leads: 9, cpl: 122.2 },
    { date: 'Nov 10', spend: 1350, leads: 12, cpl: 112.5 },
    { date: 'Nov 15', spend: 1600, leads: 15, cpl: 106.6 },
    { date: 'Nov 20', spend: 1900, leads: 18, cpl: 105.5 },
  ];

  const platformShareData = [
    { name: 'Meta Ads (Instagram & Facebook)', value: 68, color: '#635BFF' },
    { name: 'Google Ads (Search & Discovery)', value: 32, color: '#4285F4' },
  ];

  const propertyRoiData = [
    {
      community: 'Palm Jumeirah',
      spend: 4900,
      leads: 38,
      cpl: 128.94,
      qualifiedRatio: '74%',
      status: 'High ROI',
    },
    {
      community: 'Downtown Dubai',
      spend: 3500,
      leads: 24,
      cpl: 145.83,
      qualifiedRatio: '68%',
      status: 'High ROI',
    },
    {
      community: 'Dubai Hills Estate',
      spend: 1800,
      leads: 16,
      cpl: 112.50,
      qualifiedRatio: '62%',
      status: 'Optimal',
    },
  ];

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Spend_AED,Leads,CPL_AED\n"
      + trendData.map(e => `${e.date},${e.spend},${e.leads},${e.cpl}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admatrix_performance_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell title="Analytics & Attribution" subtitle="Real estate advertising performance, cost benchmarks, and channel ROI">
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF0] shadow-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#737B8C]" />
            <div className="flex items-center bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl p-1 text-xs font-semibold">
              {['7D', '30D', '90D', 'YTD'].map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    dateRange === r ? 'bg-white text-[#635BFF] shadow-sm' : 'text-[#737B8C]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E8EAF0] text-[#151923] hover:bg-[#F7F8FA] shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
        </div>

        {/* 6 Key Benchmarks */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Total Ad Spend</span>
            <div className="text-xl font-bold text-[#151923]">AED 10,200</div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-[#16A36A]">
              <ArrowUpRight className="w-3 h-3" /> +14.2% vs prev
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Total Impressions</span>
            <div className="text-xl font-bold text-[#151923]">70,600</div>
            <div className="mt-1 text-[10px] text-[#737B8C]">Meta & Google</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Clicks</span>
            <div className="text-xl font-bold text-[#151923]">3,090</div>
            <div className="mt-1 text-[10px] text-[#16A36A]">4.37% CTR</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Total Leads</span>
            <div className="text-xl font-bold text-[#16A36A]">78</div>
            <div className="mt-1 text-[10px] text-[#16A36A] font-medium">Verified Phone & Email</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Average CPC</span>
            <div className="text-xl font-bold text-[#151923]">AED 2.78</div>
            <div className="mt-1 text-[10px] text-[#737B8C]">Cost per click</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Average CPL</span>
            <div className="text-xl font-bold text-[#151923]">AED 130.76</div>
            <div className="mt-1 text-[10px] text-[#16A36A]">Cost per lead</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Spend & Leads Trend */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8EAF0] shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#151923]">Cost Per Lead (CPL) Efficiency Over Time</h3>
                <p className="text-xs text-[#737B8C]">Tracking ad spend yield and acquisition cost downward trend</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="cplGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A36A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16A36A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F5" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737B8C' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737B8C' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8EAF0', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="cpl" stroke="#16A36A" strokeWidth={2} fillOpacity={1} fill="url(#cplGrad)" name="CPL (AED)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform Share */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF0] shadow-card flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#151923] mb-1">Platform Distribution</h3>
              <p className="text-xs text-[#737B8C] mb-4">Ad spend allocated between Meta and Google</p>

              <div className="space-y-4">
                <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-[#E1306C]" />
                    <span className="text-xs font-semibold text-[#151923]">Meta (Instagram / FB)</span>
                  </div>
                  <span className="text-xs font-bold text-[#635BFF]">68% (AED 6,936)</span>
                </div>

                <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-[#4285F4]" />
                    <span className="text-xs font-semibold text-[#151923]">Google Ads</span>
                  </div>
                  <span className="text-xs font-bold text-[#4285F4]">32% (AED 3,264)</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#E7F7F0] rounded-xl border border-[#B7EBD4] text-[11px] text-[#16A36A] mt-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>100% of impressions served under active DLD Trakheesi permits.</span>
            </div>
          </div>
        </div>

        {/* Community ROI Table */}
        <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E8EAF0]">
            <h3 className="text-sm font-semibold text-[#151923]">Community Performance Breakdown</h3>
            <p className="text-xs text-[#737B8C]">Property-level ROI, inquiry volumes, and qualification rates</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8EAF0] bg-[#FAFAFC] text-[11px] font-semibold text-[#737B8C] uppercase">
                  <th className="py-3 px-4">Community Area</th>
                  <th className="py-3 px-4">Total Spend</th>
                  <th className="py-3 px-4">Leads</th>
                  <th className="py-3 px-4">Cost Per Lead (CPL)</th>
                  <th className="py-3 px-4">Buyer Qualification Ratio</th>
                  <th className="py-3 px-4">Performance Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EAF0]">
                {propertyRoiData.map((row) => (
                  <tr key={row.community} className="hover:bg-[#F7F8FA]">
                    <td className="py-3 px-4 font-semibold text-[#151923]">{row.community}</td>
                    <td className="py-3 px-4 text-[#151923]">AED {row.spend.toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-[#16A36A]">{row.leads}</td>
                    <td className="py-3 px-4 text-[#737B8C]">AED {row.cpl.toFixed(2)}</td>
                    <td className="py-3 px-4 text-[#151923] font-medium">{row.qualifiedRatio}</td>
                    <td className="py-3 px-4">
                      <Badge variant="success" size="sm">{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

