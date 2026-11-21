'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ComplianceBadge } from '@/components/properties/ComplianceBadge';
import { Badge } from '@/components/ui/Badge';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Sparkles,
  Megaphone,
  Eye,
  MoreVertical,
  QrCode,
  ShieldCheck,
  Bed,
  Bath,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';

export default function PropertiesListPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [listingFilter, setListingFilter] = useState('ALL');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      if (data.data) {
        setProperties(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Filter logic
  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.community.toLowerCase().includes(search.toLowerCase()) ||
      (p.trakheesiPermitNo && p.trakheesiPermitNo.includes(search)) ||
      (p.buildingProject && p.buildingProject.toLowerCase().includes(search.toLowerCase()));

    const matchesCompliance = complianceFilter === 'ALL' || p.complianceStatus === complianceFilter;
    const matchesType = typeFilter === 'ALL' || p.propertyType === typeFilter;
    const matchesListing = listingFilter === 'ALL' || p.listingType === listingFilter;

    return matchesSearch && matchesCompliance && matchesType && matchesListing;
  });

  return (
    <AppShell title="Property Portfolio" subtitle="Manage listings, verify Trakheesi permits, and launch automated campaigns">
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8EAF0] shadow-card">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#737B8C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title, community, permit #, or project..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#635BFF] focus:bg-white transition-all text-[#151923]"
            />
          </div>

          {/* Filters & View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Compliance Filter */}
            <select
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl font-medium text-[#151923] focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
            >
              <option value="ALL">All Permits</option>
              <option value="COMPLIANT">Compliant Only</option>
              <option value="EXPIRED">Expired</option>
              <option value="ACTION_REQUIRED">Action Required</option>
              <option value="INCOMPLETE">Incomplete</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl font-medium text-[#151923] focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
            >
              <option value="ALL">All Types</option>
              <option value="Villa">Villas</option>
              <option value="Apartment">Apartments</option>
              <option value="Penthouse">Penthouses</option>
              <option value="Townhouse">Townhouses</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center border border-[#E8EAF0] rounded-xl overflow-hidden bg-[#F7F8FA]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-white text-[#635BFF] shadow-sm' : 'text-[#737B8C] hover:text-[#151923]'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-white text-[#635BFF] shadow-sm' : 'text-[#737B8C] hover:text-[#151923]'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Add Property Button */}
            <Link
              href="/properties/new"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Property</span>
            </Link>
          </div>
        </div>

        {/* Content View: Grid or List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-white rounded-2xl border border-[#E8EAF0] animate-pulse p-4" />
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EAF0] p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F0EFFF] text-[#635BFF] flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto">
              <h3 className="text-base font-semibold text-[#151923]">No Properties Found</h3>
              <p className="text-xs text-[#737B8C] mt-1">
                No property listings match your selected search criteria or filters.
              </p>
            </div>
            <button
              onClick={() => { setSearch(''); setComplianceFilter('ALL'); setTypeFilter('ALL'); }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#F7F8FA] border border-[#E8EAF0] text-[#151923] hover:bg-[#E8EAF0] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card hover:shadow-elevated transition-all overflow-hidden flex flex-col group"
              >
                {/* Image & Badges */}
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={p.coverImage || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <ComplianceBadge status={p.complianceStatus} permitNo={p.trakheesiPermitNo} />
                    {p.isOffPlan && (
                      <Badge variant="primary" size="sm">Off-Plan</Badge>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant="neutral" size="sm">
                      {p.listingType}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-[#151923] shadow-sm">
                    {p.currency} {p.price?.toLocaleString()}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-[#635BFF] uppercase tracking-wider mb-1">
                      {p.community} {p.buildingProject ? `• ${p.buildingProject}` : ''}
                    </div>
                    <Link
                      href={`/properties/${p.id}`}
                      className="text-sm font-semibold text-[#151923] hover:text-[#635BFF] transition-colors line-clamp-2 mb-2"
                    >
                      {p.title}
                    </Link>

                    {/* Specs */}
                    <div className="flex items-center gap-4 text-xs text-[#737B8C] py-2 border-y border-[#F0F1F5] my-2">
                      <div className="flex items-center gap-1">
                        <Bed className="w-3.5 h-3.5 text-[#151923]" />
                        <span>{p.bedrooms} Beds</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="w-3.5 h-3.5 text-[#151923]" />
                        <span>{p.bathrooms} Baths</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5 text-[#151923]" />
                        <span>{p.builtUpArea?.toLocaleString()} sqft</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 flex items-center justify-between gap-2">
                    <Link
                      href={`/properties/${p.id}`}
                      className="flex-1 text-center py-2 text-xs font-semibold rounded-lg bg-[#F7F8FA] hover:bg-[#F0EFFF] text-[#151923] hover:text-[#635BFF] border border-[#E8EAF0] transition-colors"
                    >
                      Details
                    </Link>
                    <Link
                      href={`/ad-studio?propertyId=${p.id}`}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-[#635BFF] hover:bg-[#5248E2] text-white transition-colors shadow-sm"
                      title="Generate AI Ad"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Studio</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List Mode */
          <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8EAF0] bg-[#FAFAFC] text-[11px] font-semibold text-[#737B8C] uppercase tracking-wider">
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Community / Project</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Specs</th>
                    <th className="py-3 px-4">Trakheesi Status</th>
                    <th className="py-3 px-4">Campaigns</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAF0] text-xs">
                  {filteredProperties.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F7F8FA] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.coverImage || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=150&q=80'}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <Link href={`/properties/${p.id}`} className="font-semibold text-[#151923] hover:text-[#635BFF] transition-colors block truncate max-w-xs">
                              {p.title}
                            </Link>
                            <span className="text-[11px] text-[#737B8C]">{p.propertyType} • {p.listingType}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#151923]">
                        <div>{p.community}</div>
                        <div className="text-[11px] text-[#737B8C]">{p.buildingProject || '—'}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#151923]">
                        {p.currency} {p.price?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-[#737B8C]">
                        {p.bedrooms} Beds • {p.builtUpArea?.toLocaleString()} sqft
                      </td>
                      <td className="py-3 px-4">
                        <ComplianceBadge status={p.complianceStatus} permitNo={p.trakheesiPermitNo} />
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm">
                          {p.campaigns?.length || 0} Ads
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/ad-studio?propertyId=${p.id}`}
                            className="p-1.5 rounded-lg bg-[#F0EFFF] text-[#635BFF] hover:bg-[#635BFF] hover:text-white transition-colors"
                            title="Generate AI Ad"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/properties/${p.id}`}
                            className="p-1.5 rounded-lg border border-[#E8EAF0] text-[#737B8C] hover:text-[#151923] hover:bg-[#F7F8FA] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
