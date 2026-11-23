'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { ComplianceBadge } from '@/components/properties/ComplianceBadge';
import {
  Sparkles,
  Building2,
  Copy,
  Download,
  Share2,
  Layers,
  Globe2,
  RefreshCw,
  Check,
  QrCode,
  ShieldCheck,
  Maximize2,
  Instagram,
  Facebook,
  Send,
  Eye,
  Sliders,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { uploadMediaFile } from '@/lib/media-upload';

function AdStudioContent() {
  const searchParams = useSearchParams();
  const initialPropId = searchParams.get('propertyId');

  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropId || '');
  const [platform, setPlatform] = useState<'META' | 'GOOGLE'>('META');
  const [language, setLanguage] = useState<'en' | 'ar' | 'both'>('both');
  const [tone, setTone] = useState<'LUXURY' | 'INVESTOR_ROI' | 'WATERFRONT' | 'FAMILY'>('LUXURY');
  const [format, setFormat] = useState<'SQUARE' | 'PORTRAIT' | 'STORY'>('SQUARE');
  
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable Creative Canvas State
  const [headlineText, setHeadlineText] = useState('');
  const [primaryText, setPrimaryText] = useState('');
  const [ctaText, setCtaText] = useState('Learn More');
  const [savingAsset, setSavingAsset] = useState(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch properties
  useEffect(() => {
    async function loadProperties() {
      try {
        const res = await fetch('/api/properties');
        const data = await res.json();
        if (data.data) {
          setProperties(data.data);
          if (!selectedPropertyId && data.data.length > 0) {
            setSelectedPropertyId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
      }
    }
    loadProperties();
  }, []);

  const activeProperty = properties.find((p) => p.id === selectedPropertyId);

  // Trigger AI generation
  const handleGenerate = async () => {
    if (!activeProperty) return;
    setGenerating(true);

    try {
      const res = await fetch('/api/ai/generate-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: activeProperty.id,
          propertyTitle: activeProperty.title,
          propertyType: activeProperty.propertyType,
          price: activeProperty.price,
          currency: activeProperty.currency,
          community: activeProperty.community,
          bedrooms: activeProperty.bedrooms,
          builtUpArea: activeProperty.builtUpArea,
          platform,
          language,
          tone,
          trakheesiPermitNo: activeProperty.trakheesiPermitNo,
          isOffPlan: activeProperty.isOffPlan,
        }),
      });

      const data = await res.json();
      if (data.data && data.data.variations) {
        setVariations(data.data.variations);
        setSelectedVariationIndex(0);
        setHeadlineText(data.data.variations[0].headline);
        setPrimaryText(data.data.variations[0].primaryText);
        setCtaText(data.data.variations[0].callToAction);
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Initial generation on property change
  useEffect(() => {
    if (activeProperty) {
      handleGenerate();
    }
  }, [selectedPropertyId, tone, platform]);

  // When selected variation changes
  const activeVariation = variations[selectedVariationIndex];

  useEffect(() => {
    if (activeVariation) {
      setHeadlineText(activeVariation.headline);
      setPrimaryText(activeVariation.primaryText);
      setCtaText(activeVariation.callToAction);
    }
  }, [selectedVariationIndex, activeVariation]);

  // Copy to clipboard helper
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Deterministic HTML5 Canvas Render & Export
  const downloadCreativePNG = () => {
    if (!activeProperty) return;

    // Dimensions based on format
    let width = 1080;
    let height = 1080;
    if (format === 'PORTRAIT') height = 1350;
    if (format === 'STORY') height = 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeProperty.coverImage || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80';

    img.onload = () => {
      // Draw background image cover
      ctx.drawImage(img, 0, 0, width, height);

      // Dark gradient overlay for typography readability
      const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
      gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.7)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Top Header Pill: Agency Branding & DLD Compliance
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.roundRect(40, 40, width - 80, 70, 16);
      ctx.fill();

      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillStyle = '#151923';
      ctx.fillText('APEX LUXURY PROPERTIES DUBAI', 65, 84);

      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillStyle = '#16A36A';
      const permitStr = `TRAKHEESI PERMIT #${activeProperty.trakheesiPermitNo || '7190023419'}`;
      ctx.fillText(permitStr, width - 420, 84);

      // Main Headline
      ctx.font = 'bold 44px Inter, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(headlineText.substring(0, 48), 60, height - 280);

      // Price Tag
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.fillStyle = '#8B7CFF';
      ctx.fillText(`${activeProperty.currency} ${activeProperty.price?.toLocaleString()}`, 60, height - 220);

      // Sub-specs
      ctx.font = '500 24px Inter, sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(`${activeProperty.bedrooms} BR • ${activeProperty.builtUpArea?.toLocaleString()} SQFT • ${activeProperty.community}`, 60, height - 170);

      // CTA Button Box
      ctx.fillStyle = '#635BFF';
      ctx.roundRect(60, height - 120, 320, 60, 12);
      ctx.fill();

      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ctaText.toUpperCase(), 90, height - 82);

      // Download link trigger
      const link = document.createElement('a');
      link.download = `Admatrix_${activeProperty.community}_${format}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  // Upload rendered creative directly to S3 Media Storage
  const saveCreativeToS3 = async () => {
    if (!activeProperty) return;
    setSavingAsset(true);
    setSavedSuccessMessage(null);

    let width = 1080;
    let height = 1080;
    if (format === 'PORTRAIT') height = 1350;
    if (format === 'STORY') height = 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setSavingAsset(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeProperty.coverImage || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80';

    img.onload = async () => {
      try {
        ctx.drawImage(img, 0, 0, width, height);

        const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
        gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.7)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.roundRect(40, 40, width - 80, 70, 16);
        ctx.fill();

        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillStyle = '#151923';
        ctx.fillText('APEX LUXURY PROPERTIES DUBAI', 65, 84);

        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillStyle = '#16A36A';
        const permitStr = `TRAKHEESI PERMIT #${activeProperty.trakheesiPermitNo || '7190023419'}`;
        ctx.fillText(permitStr, width - 420, 84);

        ctx.font = 'bold 44px Inter, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(headlineText.substring(0, 48), 60, height - 280);

        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillStyle = '#8B7CFF';
        ctx.fillText(`${activeProperty.currency} ${activeProperty.price?.toLocaleString()}`, 60, height - 220);

        ctx.font = '500 24px Inter, sans-serif';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(`${activeProperty.bedrooms} BR • ${activeProperty.builtUpArea?.toLocaleString()} SQFT • ${activeProperty.community}`, 60, height - 170);

        ctx.fillStyle = '#635BFF';
        ctx.roundRect(60, height - 120, 320, 60, 12);
        ctx.fill();

        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(ctaText.toUpperCase(), 90, height - 82);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            setSavingAsset(false);
            return;
          }

          const fileName = `creative_${activeProperty.community?.toLowerCase().replace(/\s+/g, '_')}_${format.toLowerCase()}_${Date.now()}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });

          try {
            const asset = await uploadMediaFile(file, 'AD_CREATIVE', {
              propertyId: activeProperty.id,
            });

            setSavedSuccessMessage(`Saved to S3 Media Storage: ${asset.fileName}`);
            setTimeout(() => setSavedSuccessMessage(null), 5000);
          } catch (uploadErr: any) {
            console.error('Failed to upload ad creative:', uploadErr);
            alert(`Upload failed: ${uploadErr.message || 'Unknown error'}`);
          } finally {
            setSavingAsset(false);
          }
        }, 'image/png');
      } catch (err) {
        console.error('Failed rendering creative:', err);
        setSavingAsset(false);
      }
    };

    img.onerror = () => {
      alert('Unable to load source image for rendering.');
      setSavingAsset(false);
    };
  };

  return (
    <AppShell title="AI Ad Studio" subtitle="Generate high-converting, Trakheesi-compliant creatives in English & Arabic">
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF0] shadow-card flex flex-wrap items-center justify-between gap-4">
          {/* Property Selector */}
          <div className="flex items-center gap-3 min-w-[280px]">
            <Building2 className="w-5 h-5 text-[#635BFF] shrink-0" />
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#737B8C] uppercase block mb-1">
                Active Property Listing
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#151923] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.currency} {p.price?.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Configuration Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform */}
            <div className="flex items-center border border-[#E8EAF0] rounded-xl overflow-hidden bg-[#F7F8FA]">
              <button
                onClick={() => setPlatform('META')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${platform === 'META' ? 'bg-[#635BFF] text-white' : 'text-[#737B8C] hover:text-[#151923]'}`}
              >
                <Instagram className="w-3.5 h-3.5" /> Meta Ads
              </button>
              <button
                onClick={() => setPlatform('GOOGLE')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${platform === 'GOOGLE' ? 'bg-[#635BFF] text-white' : 'text-[#737B8C] hover:text-[#151923]'}`}
              >
                <Globe2 className="w-3.5 h-3.5" /> Google Ads
              </button>
            </div>

            {/* Language */}
            <select
              value={language}
              onChange={(e: any) => setLanguage(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#151923]"
            >
              <option value="both">English + Arabic (العربية)</option>
              <option value="en">English Only</option>
              <option value="ar">Arabic Only (العربية)</option>
            </select>

            {/* Tone */}
            <select
              value={tone}
              onChange={(e: any) => setTone(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#151923]"
            >
              <option value="LUXURY">Luxury Elite</option>
              <option value="INVESTOR_ROI">High ROI Investor</option>
              <option value="WATERFRONT">Waterfront Lifestyle</option>
              <option value="FAMILY">Family Sanctuary</option>
            </select>

            {/* Regenerate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Synthesizing...' : 'Regenerate'}</span>
            </button>
          </div>
        </div>

        {/* Workspace: 2-Column Studio (Left: Copy Variations & Settings, Right: Live Canvas Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Copy Variations & Editing (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Copy Variations Tabs */}
            <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#151923] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#635BFF]" />
                    AI-Generated Copy Variations
                  </h3>
                  <p className="text-xs text-[#737B8C]">
                    High-converting copy calibrated for Dubai high-net-worth real estate buyers.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {variations.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedVariationIndex(idx)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        selectedVariationIndex === idx
                          ? 'bg-[#635BFF] text-white'
                          : 'bg-[#F7F8FA] text-[#737B8C] hover:text-[#151923]'
                      }`}
                    >
                      Option {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {activeVariation && (
                <div className="space-y-4">
                  {/* English Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#737B8C] uppercase tracking-wider">
                        English Copy
                      </span>
                      <button
                        onClick={() => handleCopy(`${headlineText}\n\n${primaryText}`, 'all_en')}
                        className="text-[11px] text-[#635BFF] font-semibold flex items-center gap-1 hover:underline"
                      >
                        {copiedField === 'all_en' ? <Check className="w-3 h-3 text-[#16A36A]" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'all_en' ? 'Copied!' : 'Copy English Ad'}
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#151923]">Headline</label>
                      <input
                        type="text"
                        value={headlineText}
                        onChange={(e) => setHeadlineText(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#151923]">Primary Ad Body</label>
                      <textarea
                        rows={4}
                        value={primaryText}
                        onChange={(e) => setPrimaryText(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF] leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-medium text-[#151923]">Call To Action</label>
                        <input
                          type="text"
                          value={ctaText}
                          onChange={(e) => setCtaText(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:ring-1 focus:ring-[#635BFF]"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-medium text-[#151923]">Trakheesi Tagline</label>
                        <div className="px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#16A36A] font-mono truncate">
                          {activeProperty?.trakheesiPermitNo ? `Permit #${activeProperty.trakheesiPermitNo}` : 'Permit Pending'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arabic (العربية) Section */}
                  {activeVariation.headlineAr && (
                    <div className="space-y-3 pt-4 border-t border-[#E8EAF0]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#737B8C] uppercase tracking-wider">
                          Arabic Copy (النسخة العربية المعتمدة)
                        </span>
                        <button
                          onClick={() => handleCopy(`${activeVariation.headlineAr}\n\n${activeVariation.primaryTextAr}`, 'all_ar')}
                          className="text-[11px] text-[#635BFF] font-semibold flex items-center gap-1 hover:underline"
                        >
                          {copiedField === 'all_ar' ? <Check className="w-3 h-3 text-[#16A36A]" /> : <Copy className="w-3 h-3" />}
                          {copiedField === 'all_ar' ? 'تم النسخ!' : 'نسخ الإعلان العربي'}
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#151923]">العنوان الرئيسي</label>
                        <input
                          type="text"
                          dir="rtl"
                          defaultValue={activeVariation.headlineAr}
                          className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-right font-medium text-[#151923]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#151923]">نص الإعلان</label>
                        <textarea
                          rows={3}
                          dir="rtl"
                          defaultValue={activeVariation.primaryTextAr}
                          className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-right text-[#151923] leading-relaxed"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live Creative Studio Canvas (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#151923]">Ad Creative Canvas</h3>
                  <p className="text-xs text-[#737B8C]">Deterministic rendering with Trakheesi badge & Madmoun QR</p>
                </div>
                <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 border border-[#E8EAF0] rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setFormat('SQUARE')}
                    className={`px-2 py-1 rounded-lg transition-colors ${format === 'SQUARE' ? 'bg-white text-[#635BFF] shadow-sm' : 'text-[#737B8C]'}`}
                  >
                    1:1
                  </button>
                  <button
                    onClick={() => setFormat('PORTRAIT')}
                    className={`px-2 py-1 rounded-lg transition-colors ${format === 'PORTRAIT' ? 'bg-white text-[#635BFF] shadow-sm' : 'text-[#737B8C]'}`}
                  >
                    4:5
                  </button>
                  <button
                    onClick={() => setFormat('STORY')}
                    className={`px-2 py-1 rounded-lg transition-colors ${format === 'STORY' ? 'bg-white text-[#635BFF] shadow-sm' : 'text-[#737B8C]'}`}
                  >
                    9:16
                  </button>
                </div>
              </div>

              {/* Live Canvas Mockup */}
              <div
                className={`relative mx-auto rounded-2xl overflow-hidden shadow-elevated border border-[#E8EAF0] bg-slate-900 flex flex-col justify-between transition-all ${
                  format === 'SQUARE'
                    ? 'w-full aspect-square'
                    : format === 'PORTRAIT'
                    ? 'w-[85%] aspect-[4/5]'
                    : 'w-[75%] aspect-[9/16]'
                }`}
              >
                {/* Background Image */}
                <img
                  src={activeProperty?.coverImage || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Shaded Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 pointer-events-none" />

                {/* Top Bar: Agency Branding & Trakheesi Permit */}
                <div className="relative z-10 p-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#635BFF] text-white flex items-center justify-center text-[10px] font-bold">
                      A
                    </div>
                    <span className="text-[11px] font-bold text-[#151923] tracking-tight">
                      APEX LUXURY PROPERTIES
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#E7F7F0] text-[#16A36A] px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[#B7EBD4]">
                    <ShieldCheck className="w-3 h-3" />
                    <span>TRAKHEESI #{activeProperty?.trakheesiPermitNo || '7190023419'}</span>
                  </div>
                </div>

                {/* Bottom Overlay: Price, Headline, QR & CTA */}
                <div className="relative z-10 p-5 space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[#8B7CFF] uppercase tracking-wider">
                        {activeProperty?.community} • {activeProperty?.bedrooms} BEDS
                      </div>
                      <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
                        {headlineText}
                      </h4>
                      <div className="text-base font-extrabold text-white">
                        {activeProperty?.currency} {activeProperty?.price?.toLocaleString()}
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="shrink-0 bg-white p-1 rounded-xl shadow-md border border-white/30 text-center">
                      <img
                        src={activeProperty?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://dubailand.gov.ae/en/eservices/trakheesi-permit/${activeProperty?.trakheesiPermitNo || '7190023419'}`}
                        alt="Madmoun QR"
                        className="w-12 h-12 rounded"
                      />
                      <span className="text-[8px] font-bold text-[#151923] block leading-tight mt-0.5">MADMOUN</span>
                    </div>
                  </div>

                  {/* CTA Banner */}
                  <div className="w-full py-2 bg-[#635BFF] text-white font-bold text-center text-xs rounded-xl shadow-md uppercase tracking-wider">
                    {ctaText}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {savedSuccessMessage && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{savedSuccessMessage}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={downloadCreativePNG}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl bg-[#151923] hover:bg-black text-white transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG Creative</span>
                </button>

                <button
                  onClick={saveCreativeToS3}
                  disabled={savingAsset}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-[#F0EFFF] text-[#635BFF] hover:bg-[#D5D1FF] transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {savingAsset ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to S3...</span>
                    </>
                  ) : (
                    <span>Save to Assets</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AdStudioPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center text-xs text-[#737B8C]">Loading AI Ad Studio...</div>}>
      <AdStudioContent />
    </Suspense>
  );
}
