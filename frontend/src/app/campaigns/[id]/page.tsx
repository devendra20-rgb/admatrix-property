'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { ComplianceBadge } from '@/components/properties/ComplianceBadge';
import {
  Megaphone,
  DollarSign,
  Users2,
  TrendingUp,
  Eye,
  MousePointerClick,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  Instagram,
  Globe2,
  Calendar,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';

export default function CampaignDetailsPage() {
  const params = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const res = await fetch(`/api/campaigns/${params.id}`);
        const data = await res.json();
        if (data.data) {
          setCampaign(data.data);
        }
      } catch (err) {
        console.error('Error fetching campaign:', err);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) loadCampaign();
  }, [params.id]);

  if (loading) {
    return (
      <AppShell title="Campaign Details">
        <div className="h-96 flex items-center justify-center text-xs text-[#737B8C]">
          Loading campaign data...
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell title="Campaign Not Found">
        <div className="text-center py-12">
          <p className="text-sm text-[#737B8C]">The requested campaign was not found.</p>
          <Link href="/campaigns" className="mt-4 inline-block text-xs text-[#635BFF] font-semibold">
            Return to campaigns
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={campaign.name} subtitle={`${campaign.platform} Ads • Property: ${campaign.property?.title}`}>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF0] shadow-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0EFFF] text-[#635BFF] flex items-center justify-center shrink-0">
              {campaign.platform === 'META' ? <Instagram className="w-5 h-5 text-[#E1306C]" /> : <Globe2 className="w-5 h-5 text-[#4285F4]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#151923]">{campaign.name}</h2>
                <Badge variant={campaign.status === 'ACTIVE' ? 'success' : 'warning'}>
                  {campaign.status}
                </Badge>
              </div>
              <p className="text-xs text-[#737B8C]">
                Objective: {campaign.objective} • Budget: {campaign.currency} {campaign.budgetAmount}/day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/properties/${campaign.propertyId}`}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F7F8FA] border border-[#E8EAF0] text-[#151923] hover:bg-[#E8EAF0] transition-colors"
            >
              View Property
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Total Ad Spend</span>
            <div className="text-xl font-bold text-[#151923]">
              AED {campaign.spend?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Total Impressions</span>
            <div className="text-xl font-bold text-[#151923]">
              {campaign.impressions?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Clicks</span>
            <div className="text-xl font-bold text-[#151923]">
              {campaign.clicks?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E8EAF0] shadow-card">
            <span className="text-xs text-[#737B8C] font-medium block mb-1">Leads Generated</span>
            <div className="text-xl font-bold text-[#16A36A]">
              {campaign.leadsCount || 0}
            </div>
          </div>
        </div>

        {/* Lead Attribution Section */}
        <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E8EAF0] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#151923]">Attributed Leads from this Campaign</h3>
              <p className="text-xs text-[#737B8C]">Directly captured inquiries mapped to this campaign ad ID</p>
            </div>
            <Link href="/leads" className="text-xs font-semibold text-[#635BFF] hover:underline">
              View All Leads
            </Link>
          </div>

          <div className="divide-y divide-[#E8EAF0]">
            {campaign.leads && campaign.leads.length > 0 ? (
              campaign.leads.map((l: any) => (
                <div key={l.id} className="p-4 flex items-center justify-between hover:bg-[#F7F8FA] transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#151923]">{l.name}</span>
                      <Badge variant="neutral" size="sm">{l.status}</Badge>
                      <span className="text-[11px] text-[#737B8C] font-mono">{l.phone}</span>
                    </div>
                    <p className="text-[11px] text-[#737B8C]">{l.notes || 'Inquired via ad instant form'}</p>
                  </div>
                  <Link
                    href={`/leads`}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#E7F7F0] text-[#16A36A]"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-[#737B8C]">
                No leads recorded yet for this active campaign run.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

