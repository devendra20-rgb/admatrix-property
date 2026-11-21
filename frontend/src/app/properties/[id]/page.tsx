'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ComplianceBadge } from '@/components/properties/ComplianceBadge';
import { Badge } from '@/components/ui/Badge';
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Sparkles,
  Megaphone,
  ShieldCheck,
  QrCode,
  Calendar,
  DollarSign,
  Share2,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProperty() {
      try {
        const res = await fetch(`/api/properties/${params.id}`);
        const data = await res.json();
        if (data.data) {
          setProperty(data.data);
          setCompliance(data.compliance);
        }
      } catch (err) {
        console.error('Failed to load property:', err);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) loadProperty();
  }, [params.id]);

  if (loading) {
    return (
      <AppShell title="Property Details">
        <div className="h-96 flex items-center justify-center text-xs text-[#737B8C]">
          Loading property records...
        </div>
      </AppShell>
    );
  }

  if (!property) {
    return (
      <AppShell title="Property Not Found">
        <div className="text-center py-12">
          <p className="text-sm text-[#737B8C]">The requested property was not found.</p>
          <Link href="/properties" className="mt-4 inline-block text-xs text-[#635BFF] font-semibold">
            Return to properties
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={property.title} subtitle={`${property.community} • ${property.propertyType}`}>
      <div className="space-y-6">
        {/* Header Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8EAF0] shadow-card">
          <div className="flex items-center gap-3">
            <ComplianceBadge status={property.complianceStatus} permitNo={property.trakheesiPermitNo} />
            <Badge variant="outline">{property.listingType}</Badge>
            {property.isOffPlan && <Badge variant="primary">Off-Plan Escrow Verified</Badge>}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/ad-studio?propertyId=${property.id}`}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch in AI Ad Studio</span>
            </Link>

            <Link
              href={`/campaigns/new?propertyId=${property.id}`}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E8EAF0] text-[#151923] hover:bg-[#F7F8FA] transition-colors"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </Link>
          </div>
        </div>

        {/* Hero Section: Gallery + Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Showcase */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative h-96 w-full rounded-2xl overflow-hidden border border-[#E8EAF0] bg-slate-100 shadow-card">
              <img
                src={property.coverImage || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80'}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-[#E8EAF0]">
                <div className="text-[11px] font-semibold text-[#737B8C] uppercase">Asking Price</div>
                <div className="text-xl font-bold text-[#151923]">
                  {property.currency} {property.price?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8EAF0] shadow-card space-y-3">
              <h3 className="text-sm font-semibold text-[#151923]">Property Description</h3>
              <p className="text-xs text-[#4B5565] leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>
          </div>

          {/* Compliance & Permit Info Panel */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E8EAF0] shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-[#E8EAF0] pb-3">
                <h3 className="text-sm font-semibold text-[#151923] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#16A36A]" />
                  Trakheesi Permit Verification
                </h3>
                <span className="text-xs font-bold text-[#16A36A]">
                  {compliance?.score || 100}% Score
                </span>
              </div>

              {/* Madmoun QR Code */}
              {property.qrCodeUrl && (
                <div className="flex items-center gap-4 p-3 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0]">
                  <img
                    src={property.qrCodeUrl}
                    alt="Madmoun QR"
                    className="w-20 h-20 bg-white p-1 rounded-lg border border-[#E8EAF0]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#151923] flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-[#635BFF]" />
                      Madmoun DLD QR Code
                    </div>
                    <p className="text-[11px] text-[#737B8C] mt-1">
                      Embedded onto all AI Ad Studio image creatives for automated regulatory compliance.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#F0F1F5]">
                  <span className="text-[#737B8C]">Permit Number</span>
                  <span className="font-mono font-semibold text-[#151923]">{property.trakheesiPermitNo || 'None'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F0F1F5]">
                  <span className="text-[#737B8C]">Permit Expiry</span>
                  <span className="font-medium text-[#151923]">
                    {property.permitExpiryDate ? new Date(property.permitExpiryDate).toLocaleDateString('en-GB') : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F0F1F5]">
                  <span className="text-[#737B8C]">Form A Authorization</span>
                  <span className="font-medium text-[#16A36A] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                  </span>
                </div>
                {property.isOffPlan && (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-[#F0F1F5]">
                      <span className="text-[#737B8C]">Developer</span>
                      <span className="font-medium text-[#151923]">{property.developerName}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[#F0F1F5]">
                      <span className="text-[#737B8C]">Escrow Account</span>
                      <span className="font-mono text-[#151923]">{property.escrowNumber}</span>
                    </div>
                  </>
                )}
              </div>

              {compliance && !compliance.canLaunchCampaign && (
                <div className="p-3 bg-[#FDEEEC] rounded-xl border border-[#F8C8C4] text-[#E05252] text-xs">
                  <div className="font-semibold mb-1">Launch Restrictions Active:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {compliance.issues.map((iss: string, idx: number) => (
                      <li key={idx}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Property Key Specs */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8EAF0] shadow-card space-y-3">
              <h3 className="text-sm font-semibold text-[#151923]">Specifications</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F7F8FA] rounded-xl">
                  <span className="text-[11px] text-[#737B8C] block">Bedrooms</span>
                  <span className="font-semibold text-[#151923]">{property.bedrooms} Bed</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl">
                  <span className="text-[11px] text-[#737B8C] block">Bathrooms</span>
                  <span className="font-semibold text-[#151923]">{property.bathrooms} Bath</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl">
                  <span className="text-[11px] text-[#737B8C] block">Built-Up Area</span>
                  <span className="font-semibold text-[#151923]">{property.builtUpArea?.toLocaleString()} sqft</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl">
                  <span className="text-[11px] text-[#737B8C] block">Furnishing</span>
                  <span className="font-semibold text-[#151923]">{property.furnishingStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

