'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { ComplianceBadge } from '@/components/properties/ComplianceBadge';
import {
  Megaphone,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Instagram,
  Globe2,
  Rocket,
  Lock,
} from 'lucide-react';

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPropId = searchParams.get('propertyId');

  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string>(initialPropId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'META' | 'GOOGLE' | 'BOTH'>('META');
  const [objective, setObjective] = useState('LEADS');
  const [budgetType, setBudgetType] = useState('DAILY');
  const [budgetAmount, setBudgetAmount] = useState('350');
  const [targetLocations, setTargetLocations] = useState<string[]>(['Dubai', 'Abu Dhabi', 'Riyadh']);

  useEffect(() => {
    async function loadProperties() {
      try {
        const res = await fetch('/api/properties');
        const data = await res.json();
        if (data.data) {
          setProperties(data.data);
          if (!selectedPropId && data.data.length > 0) {
            setSelectedPropId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load properties:', err);
      }
    }
    loadProperties();
  }, []);

  const activeProperty = properties.find((p) => p.id === selectedPropId);

  useEffect(() => {
    if (activeProperty) {
      setName(`${activeProperty.community} - ${platform} High Net Worth Campaign`);
    }
  }, [activeProperty, platform]);

  // Compliance check on active property
  const isExpired = activeProperty?.complianceStatus === 'EXPIRED';
  const isIncomplete = activeProperty?.complianceStatus === 'INCOMPLETE';
  const isCompliant = activeProperty?.complianceStatus === 'COMPLIANT';

  const canLaunch = isCompliant;

  const handleLaunch = async () => {
    if (!canLaunch) {
      setError('Cannot launch campaign: Regulatory Trakheesi compliance verification failed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropId,
          name,
          platform,
          objective,
          budgetType,
          budgetAmount: parseFloat(budgetAmount) || 200,
          targetLocations,
          status: 'ACTIVE',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      router.push(`/campaigns/${data.data.id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during campaign launch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Launch Ad Campaign" subtitle="Compliant multi-channel campaign wizard for Meta & Google">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Step Indicator Header */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8EAF0] shadow-card space-y-6">
          <div>
            <h3 className="text-base font-semibold text-[#151923]">1. Select Property Listing</h3>
            <p className="text-xs text-[#737B8C]">Every advertisement must be bound to a DLD-verified listing.</p>
          </div>

          <div className="space-y-3">
            <select
              value={selectedPropId}
              onChange={(e) => setSelectedPropId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#151923] focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.complianceStatus})
                </option>
              ))}
            </select>

            {/* Active Property Compliance Card */}
            {activeProperty && (
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isCompliant
                  ? 'bg-[#E7F7F0]/40 border-[#B7EBD4]'
                  : isExpired
                  ? 'bg-[#FDEEEC] border-[#F8C8C4]'
                  : 'bg-[#FDF5E8] border-[#FBE3B5]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isCompliant ? 'bg-[#16A36A] text-white' : 'bg-[#E05252] text-white'
                  }`}>
                    {isCompliant ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#151923] flex items-center gap-2">
                      <span>Trakheesi Permit Status</span>
                      <ComplianceBadge status={activeProperty.complianceStatus} permitNo={activeProperty.trakheesiPermitNo} />
                    </div>
                    <p className="text-[11px] text-[#737B8C] mt-0.5">
                      {isCompliant
                        ? 'Passed validation. Official Madmoun QR code verified for Meta & Google publishing.'
                        : isExpired
                        ? 'Campaign launch blocked: The Trakheesi permit has expired. DLD renewal required.'
                        : 'Campaign launch blocked: Form A or Permit number is incomplete.'}
                    </p>
                  </div>
                </div>

                {!canLaunch && (
                  <Link
                    href={`/properties/${activeProperty.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E8EAF0] text-[#E05252] hover:bg-[#F7F8FA] shrink-0"
                  >
                    Fix Permit
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Campaign Configuration */}
          <div className="pt-4 border-t border-[#E8EAF0] space-y-4">
            <h3 className="text-base font-semibold text-[#151923]">2. Platform & Targeting</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#151923]">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#151923]">Advertising Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlatform('META')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      platform === 'META'
                        ? 'bg-[#635BFF] text-white border-[#635BFF]'
                        : 'bg-[#F7F8FA] text-[#737B8C] border-[#E8EAF0]'
                    }`}
                  >
                    <Instagram className="w-3.5 h-3.5" /> Meta
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('GOOGLE')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      platform === 'GOOGLE'
                        ? 'bg-[#635BFF] text-white border-[#635BFF]'
                        : 'bg-[#F7F8FA] text-[#737B8C] border-[#E8EAF0]'
                    }`}
                  >
                    <Globe2 className="w-3.5 h-3.5" /> Google
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('BOTH')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      platform === 'BOTH'
                        ? 'bg-[#635BFF] text-white border-[#635BFF]'
                        : 'bg-[#F7F8FA] text-[#737B8C] border-[#E8EAF0]'
                    }`}
                  >
                    Both (Omni)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#151923]">Daily Ad Budget (AED)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full pl-12 pr-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#737B8C]">
                    AED
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#151923]">Target Audience Locations</label>
              <div className="flex flex-wrap gap-2">
                {['Dubai', 'Abu Dhabi', 'Riyadh', 'Kuwait City', 'London', 'Monaco', 'Zurich'].map((loc) => {
                  const selected = targetLocations.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setTargetLocations((prev) =>
                          selected ? prev.filter((l) => l !== loc) : [...prev, loc]
                        );
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        selected
                          ? 'bg-[#F0EFFF] text-[#635BFF] border-[#D5D1FF] font-semibold'
                          : 'bg-[#F7F8FA] text-[#737B8C] border-[#E8EAF0]'
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#FDEEEC] rounded-xl border border-[#F8C8C4] text-[#E05252] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Launch Action */}
          <div className="pt-4 border-t border-[#E8EAF0] flex items-center justify-between">
            <Link
              href="/campaigns"
              className="text-xs font-semibold text-[#737B8C] hover:text-[#151923]"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleLaunch}
              disabled={!canLaunch || loading}
              className={`flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl text-white shadow-sm transition-all ${
                canLaunch
                  ? 'bg-[#16A36A] hover:bg-[#138A5A] cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
              }`}
            >
              <Rocket className="w-4 h-4" />
              <span>{loading ? 'Publishing via API...' : canLaunch ? 'Launch Campaign' : 'Compliance Blocked'}</span>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center text-xs text-[#737B8C]">Loading Campaign Wizard...</div>}>
      <NewCampaignContent />
    </Suspense>
  );
}
