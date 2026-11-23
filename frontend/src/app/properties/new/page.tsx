'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { ComplianceBadge } from '@/components/properties/ComplianceBadge';
import { ImageUpload } from '@/components/ui/ImageUpload';
import {
  Building2,
  MapPin,
  Image as ImageIcon,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Upload,
  Info,
  DollarSign,
  QrCode,
} from 'lucide-react';

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'Apartment',
    listingType: 'Sale',
    price: '',
    currency: 'AED',
    bedrooms: '2',
    bathrooms: '2',
    builtUpArea: '',
    furnishingStatus: 'Furnished',
    
    // Location
    emirate: 'Dubai',
    community: 'Downtown Dubai',
    buildingProject: '',
    address: 'Sheikh Mohammed bin Rashid Blvd, Downtown Dubai',
    latitude: '25.1972',
    longitude: '55.2744',

    // Media
    coverImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
    ],

    // Compliance
    trakheesiPermitNo: '7190023419',
    permitExpiryDate: '2027-12-31',
    qrCodeUrl: '',
    formACompleted: true,

    // Off-plan
    isOffPlan: false,
    developerName: '',
    escrowNumber: '',
    completionDate: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const steps = [
    { num: 1, title: 'Basic Info', icon: Building2 },
    { num: 2, title: 'Location', icon: MapPin },
    { num: 3, title: 'Media', icon: ImageIcon },
    { num: 4, title: 'Trakheesi Compliance', icon: ShieldCheck },
    { num: 5, title: 'Off-Plan', icon: Calendar },
    { num: 6, title: 'Review & Save', icon: CheckCircle2 },
  ];

  // Quick live validation check for preview
  const isExpired = formData.permitExpiryDate && new Date(formData.permitExpiryDate) < new Date();
  const isCompliant = Boolean(
    formData.title &&
    formData.price &&
    formData.trakheesiPermitNo &&
    !isExpired &&
    formData.formACompleted &&
    (!formData.isOffPlan || (formData.developerName && formData.escrowNumber))
  );

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        bedrooms: parseInt(formData.bedrooms) || 1,
        bathrooms: parseInt(formData.bathrooms) || 1,
        builtUpArea: parseFloat(formData.builtUpArea) || 0,
        qrCodeUrl: formData.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://dubailand.gov.ae/en/eservices/trakheesi-permit/${encodeURIComponent(formData.trakheesiPermitNo)}`,
        images: [formData.coverImage, ...formData.additionalImages],
      };

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create property');
      }

      router.push(`/properties/${data.data.id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Create Property Listing" subtitle="Register a new Dubai property with certified Trakheesi permit compliance">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF0] shadow-card">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isCurrent = step === s.num;
              const isPast = step > s.num;
              return (
                <div key={s.num} className="flex items-center flex-1 last:flex-none">
                  <div
                    onClick={() => setStep(s.num)}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/25'
                          : isPast
                          ? 'bg-[#E7F7F0] text-[#16A36A]'
                          : 'bg-[#F7F8FA] text-[#737B8C] border border-[#E8EAF0]'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                    </div>
                    <span
                      className={`hidden sm:inline text-xs font-semibold ${
                        isCurrent ? 'text-[#151923]' : isPast ? 'text-[#16A36A]' : 'text-[#737B8C]'
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex-1 mx-3 h-[2px] bg-[#E8EAF0] group-hover:bg-[#D5D1FF] transition-colors" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#FDEEEC] border border-[#F8C8C4] text-[#E05252] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Cards */}
        <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card p-6 md:p-8">
          {/* STEP 1: BASIC INFO */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#151923]">Step 1: Basic Information</h3>
                <p className="text-xs text-[#737B8C]">Provide essential listing attributes and pricing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Property Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Ultra Luxury 3BR Haven | Address Downtown"
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Property Type *</label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Listing Type *</label>
                  <select
                    name="listingType"
                    value={formData.listingType}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                  >
                    <option value="Sale">Sale</option>
                    <option value="Rent">Rent</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Asking Price *</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="e.g. 4500000"
                      className="w-full pl-14 pr-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                      required
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#737B8C]">
                      {formData.currency}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Built-Up Area (Sq.Ft) *</label>
                  <input
                    type="number"
                    name="builtUpArea"
                    value={formData.builtUpArea}
                    onChange={handleChange}
                    placeholder="e.g. 2150"
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Bedrooms</label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Bathrooms</label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Furnishing Status</label>
                  <select
                    name="furnishingStatus"
                    value={formData.furnishingStatus}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                  >
                    <option value="Furnished">Furnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe panoramic views, high-end finishing, terrace, and amenities..."
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#151923]">Step 2: Location & Address</h3>
                <p className="text-xs text-[#737B8C]">Precise Dubai community coordinates for geo-targeted ads.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Emirate</label>
                  <input
                    type="text"
                    name="emirate"
                    value={formData.emirate}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Community / Area *</label>
                  <input
                    type="text"
                    name="community"
                    value={formData.community}
                    onChange={handleChange}
                    placeholder="e.g. Palm Jumeirah, Downtown, Dubai Marina, Business Bay"
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Building / Tower Name</label>
                  <input
                    type="text"
                    name="buildingProject"
                    value={formData.buildingProject}
                    onChange={handleChange}
                    placeholder="e.g. Address Downtown, Il Primo, Marina Gate"
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Full Physical Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: MEDIA */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[#151923]">Step 3: Photography & Media</h3>
                <p className="text-xs text-[#737B8C]">
                  High-definition photography uploaded to S3 media storage and used by AI Ad Studio.
                </p>
              </div>

              {/* Primary Cover Image Direct Upload */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8EAF0] space-y-3">
                <ImageUpload
                  label="Primary Cover Photo (Required)"
                  category="PROPERTY_COVER"
                  multiple={false}
                  initialUrls={formData.coverImage ? [formData.coverImage] : []}
                  onUploadSuccess={(urls) => {
                    if (urls.length > 0) {
                      setFormData((prev) => ({ ...prev, coverImage: urls[0] }));
                    }
                  }}
                  onRemove={() => {
                    setFormData((prev) => ({ ...prev, coverImage: '' }));
                  }}
                />

                <div className="pt-2 border-t border-[#E8EAF0]/60">
                  <label className="text-[11px] font-medium text-[#737B8C] block mb-1">
                    Or specify external Cover Photo URL
                  </label>
                  <input
                    type="url"
                    name="coverImage"
                    value={formData.coverImage}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>
              </div>

              {/* Gallery Photos Multi-Upload */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8EAF0] space-y-3">
                <ImageUpload
                  label="Gallery Photos (Multiple S3 Media Upload)"
                  category="PROPERTY_IMAGE"
                  multiple={true}
                  maxFiles={12}
                  initialUrls={formData.additionalImages}
                  onUploadSuccess={(urls) => {
                    setFormData((prev) => ({ ...prev, additionalImages: urls }));
                  }}
                  onRemove={(url) => {
                    setFormData((prev) => ({
                      ...prev,
                      additionalImages: prev.additionalImages.filter((u) => u !== url),
                    }));
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: TRAKHEESI COMPLIANCE */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#151923] flex items-center gap-2">
                    Step 4: DLD Trakheesi Compliance
                    <ShieldCheck className="w-4 h-4 text-[#16A36A]" />
                  </h3>
                  <p className="text-xs text-[#737B8C]">
                    Mandatory Dubai Land Department permit verification for Meta and Google advertising.
                  </p>
                </div>
                <Badge variant={isCompliant ? 'success' : 'warning'}>
                  {isCompliant ? 'Passed Validation' : 'Incomplete'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Trakheesi Permit Number *</label>
                  <input
                    type="text"
                    name="trakheesiPermitNo"
                    value={formData.trakheesiPermitNo}
                    onChange={handleChange}
                    placeholder="e.g. 7190023419"
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl font-mono focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                    required
                  />
                  <p className="text-[10px] text-[#737B8C]">10-digit official DLD electronic advertising permit.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#151923]">Permit Expiry Date *</label>
                  <input
                    type="date"
                    name="permitExpiryDate"
                    value={formData.permitExpiryDate}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                    required
                  />
                </div>

                <div className="md:col-span-2 p-4 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="formACompleted"
                    name="formACompleted"
                    checked={formData.formACompleted}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded text-[#635BFF] focus:ring-[#635BFF] border-[#E8EAF0]"
                  />
                  <label htmlFor="formACompleted" className="text-xs text-[#151923] cursor-pointer">
                    <span className="font-semibold">Confirm Form A (Seller Agreement / Authority to Market)</span>
                    <p className="text-[11px] text-[#737B8C] mt-0.5">
                      I certify that Apex Luxury Properties holds a legally binding Form A authorization signed by the registered owner, complying with Law No. 7 of 2006.
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: OFF-PLAN */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#151923]">Step 5: Off-Plan & Developer Registration</h3>
                <p className="text-xs text-[#737B8C]">Required under DLD regulations for uncompleted developments.</p>
              </div>

              <div className="p-4 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#151923]">Is this property an off-plan development?</div>
                  <div className="text-[11px] text-[#737B8C]">Enables escrow account verification and completion timeline.</div>
                </div>
                <input
                  type="checkbox"
                  name="isOffPlan"
                  checked={formData.isOffPlan}
                  onChange={handleChange}
                  className="h-5 w-5 rounded text-[#635BFF] focus:ring-[#635BFF]"
                />
              </div>

              {formData.isOffPlan && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#151923]">Master Developer Name *</label>
                    <input
                      type="text"
                      name="developerName"
                      value={formData.developerName}
                      onChange={handleChange}
                      placeholder="e.g. Emaar Properties, Meraas, Nakheel"
                      className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#151923]">DLD Escrow Account Number *</label>
                    <input
                      type="text"
                      name="escrowNumber"
                      value={formData.escrowNumber}
                      onChange={handleChange}
                      placeholder="e.g. ESC-DLD-98234-ENBD"
                      className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl font-mono focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#151923]">Expected Handover Date</label>
                    <input
                      type="date"
                      name="completionDate"
                      value={formData.completionDate}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: REVIEW & SUBMIT */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#151923]">Step 6: Review & Finalize</h3>
                <p className="text-xs text-[#737B8C]">Verify compliance verification before saving to active portfolio.</p>
              </div>

              {/* Compliance Score Card */}
              <div className="p-4 rounded-xl border border-[#D5D1FF] bg-[#F0EFFF] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#635BFF] shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#151923]">Trakheesi Engine Status</div>
                    <div className="text-[11px] text-[#737B8C]">
                      {isCompliant
                        ? '100% Ready for Meta and Google Advertising Automation'
                        : 'Some mandatory compliance items require attention.'}
                    </div>
                  </div>
                </div>
                <Badge variant={isCompliant ? 'success' : 'warning'}>
                  {isCompliant ? 'Compliant' : 'Incomplete'}
                </Badge>
              </div>

              {/* Summary Table */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#F7F8FA] rounded-xl">
                  <span className="text-[#737B8C] block text-[11px]">Title</span>
                  <span className="font-semibold text-[#151923]">{formData.title || 'Not provided'}</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl">
                  <span className="text-[#737B8C] block text-[11px]">Price</span>
                  <span className="font-semibold text-[#151923]">{formData.currency} {Number(formData.price || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl">
                  <span className="text-[#737B8C] block text-[11px]">Community</span>
                  <span className="font-semibold text-[#151923]">{formData.community}</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl">
                  <span className="text-[#737B8C] block text-[11px]">Trakheesi Permit</span>
                  <span className="font-mono font-semibold text-[#151923]">{formData.trakheesiPermitNo || 'None'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 mt-6 border-t border-[#E8EAF0] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-[#E8EAF0] text-[#151923] hover:bg-[#F7F8FA] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <Link
                href="/properties"
                className="text-xs font-semibold text-[#737B8C] hover:text-[#151923] transition-colors"
              >
                Cancel
              </Link>
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm transition-colors"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold rounded-xl bg-[#16A36A] hover:bg-[#138A5A] text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Validating & Saving...' : 'Save & Publish Listing'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

