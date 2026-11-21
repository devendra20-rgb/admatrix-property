export interface AdGenerationParams {
  propertyTitle: string;
  propertyType: string;
  price: number;
  currency: string;
  community: string;
  bedrooms: number;
  builtUpArea: number;
  platform: 'META' | 'GOOGLE';
  language: 'en' | 'ar' | 'both';
  tone: 'LUXURY' | 'INVESTOR_ROI' | 'WATERFRONT' | 'FAMILY' | 'URGENT';
  trakheesiPermitNo?: string;
  isOffPlan?: boolean;
  developerName?: string;
}

export interface AdVariation {
  id: string;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  headlineAr?: string;
  primaryTextAr?: string;
  descriptionAr?: string;
  callToActionAr?: string;
  trakheesiDisclaimer: string;
  platform: 'META' | 'GOOGLE';
}

export interface AdGenerationResult {
  propertyTitle: string;
  platform: 'META' | 'GOOGLE';
  variations: AdVariation[];
  suggestedHashtags: string[];
  targetAudienceKeywords: string[];
}

export function generateDubaiPropertyAds(params: AdGenerationParams): AdGenerationResult {
  const formattedPrice = new Intl.NumberFormat('en-AE', { style: 'currency', currency: params.currency, maximumFractionDigits: 0 }).format(params.price);
  const permitText = params.trakheesiPermitNo ? `Trakheesi Permit #: ${params.trakheesiPermitNo}` : 'DLD Trakheesi Permit Pending';
  const permitTextAr = params.trakheesiPermitNo ? `تصريح تراخيص رقم: ${params.trakheesiPermitNo}` : 'تصريح تراخيص قيد المراجعة';

  const variations: AdVariation[] = [];

  if (params.tone === 'LUXURY' || params.tone === 'WATERFRONT') {
    variations.push({
      id: 'var-1',
      platform: params.platform,
      headline: `Exclusive ${params.propertyType} in ${params.community} | ${formattedPrice}`,
      primaryText: `Experience unmatched prestige. This ${params.bedrooms} BR ${params.propertyType.toLowerCase()} in ${params.community} spans ${params.builtUpArea.toLocaleString()} sq.ft of pure architectural grandeur. Features floor-to-ceiling panoramic views, bespoke Italian finishes, and world-class private amenities. Schedule your confidential VIP walkthrough today.`,
      description: `Prime Dubai Location • High Capital Appreciation • Private Concierge`,
      callToAction: params.platform === 'META' ? 'Learn More' : 'Book a Tour',
      headlineAr: `فيلا وشقة حصرية في ${params.community} | ${formattedPrice}`,
      primaryTextAr: `عش أرقى تجارب الفخامة في دبي. عقار استثنائي يضم ${params.bedrooms} غرف نوم بمساحة ${params.builtUpArea.toLocaleString()} قدم مربع في قلب ${params.community}. إطلالات بانورامية وتشطيبات إيطالية فاخرة. احجز معاينتك الخاصة الآن.`,
      descriptionAr: `موقع استراتيجي • خصوصية تامة • خدمات راقية على مدار الساعة`,
      callToActionAr: 'احجز الآن',
      trakheesiDisclaimer: `${permitText} | Verified by Dubai Land Department`,
    });

    variations.push({
      id: 'var-2',
      platform: params.platform,
      headline: `The Pinnacle of ${params.community} Living | ${params.bedrooms} BR Luxury`,
      primaryText: `Step into an elevated lifestyle. Located in Dubai's most coveted address, offering immediate access to prime boulevards, marina berths, and Michelin-starred dining. Listed at ${formattedPrice}. Inquire now for full brochure and private viewing details.`,
      description: `Ready for Immediate Handover • 100% Freehold Ownership for All Nationalities`,
      callToAction: 'Get Details',
      headlineAr: `قمة الفخامة والرفاهية في ${params.community}`,
      primaryTextAr: `انتقل إلى أسلوب حياة استثنائي في أرقى عناوين دبي. ${params.bedrooms} غرف نوم بإطلالات ساحرة ومرافق عالمية المستوى بسعر ${formattedPrice}. تواصل معنا للحصول على الكتيب الرقمي الكامل.`,
      descriptionAr: `تملك حر لجميع الجنسيات • جاهز للسكن الفوري`,
      callToActionAr: 'تواصل معنا',
      trakheesiDisclaimer: `${permitText} | ${permitTextAr}`,
    });
  } else if (params.tone === 'INVESTOR_ROI' || params.isOffPlan) {
    variations.push({
      id: 'var-1',
      platform: params.platform,
      headline: `High Yield Investment | ${params.bedrooms} BR in ${params.community} | 8-10% Projected ROI`,
      primaryText: `Maximize your portfolio returns in Dubai's booming real estate market. Prime ${params.propertyType.toLowerCase()} in ${params.community} starting at ${formattedPrice}. Zero personal income tax, golden visa eligible, and flexible investor payment plans available. Download full investment breakdown.`,
      description: `High Rental Yields • Capital Growth • UAE Golden Visa Qualified`,
      callToAction: 'Download Guide',
      headlineAr: `فرصة استثمارية بعائد مجزي | ${params.community} | عائد 8-10%`,
      primaryTextAr: `استثمر بذكاء في سوق عقارات دبي المزدهر. ${params.propertyType} فاخر في ${params.community} بسعر ${formattedPrice}. عائد إيجاري مرتفع وتأشيرة إقامة ذهبية للمستثمرين بدون ضرائب شخصية. اطلب دراسة الجدوى الآن.`,
      descriptionAr: `عائد إيجاري مرتفع • خطة سداد مرنة • مؤهل للإقامة الذهبية`,
      callToActionAr: 'تحميل التفاصيل',
      trakheesiDisclaimer: `${permitText} | Escrow protected under DLD regulations`,
    });

    variations.push({
      id: 'var-2',
      platform: params.platform,
      headline: `Smart Investor Opportunity: ${params.community} | From ${formattedPrice}`,
      primaryText: `Invest directly in ${params.community}. High liquidity area with proven secondary market demand. ${params.bedrooms} Bedrooms, ${params.builtUpArea.toLocaleString()} Sq Ft. Talk directly with our senior property advisors on WhatsApp.`,
      description: `Prime Developer Backing • Trusted Escrow Account • Fast Processing`,
      callToAction: 'Contact Broker',
      headlineAr: `أقوى العروض الاستثمارية في دبي: ${params.community}`,
      primaryTextAr: `فرصة استثمارية مضمونة في ${params.community}. منطقة ذات طلب إيجاري مرتفع وسيولة سريعة. تواصل مباشرة مع مستشارينا المعتمدين عبر واتساب.`,
      descriptionAr: `حساب ضمان معتمد لدى دائرة الأراضي والأملاك`,
      callToActionAr: 'تحدث معنا',
      trakheesiDisclaimer: `${permitText} | ${permitTextAr}`,
    });
  } else {
    variations.push({
      id: 'var-1',
      platform: params.platform,
      headline: `Spacious Family Living in ${params.community} | ${params.bedrooms} Bed ${params.propertyType}`,
      primaryText: `Discover your sanctuary in ${params.community}. Nestled within verdant surroundings and near Dubai's top international schools and parks. ${params.builtUpArea.toLocaleString()} sq.ft of refined space offered at ${formattedPrice}. Book your private viewing today.`,
      description: `Family Friendly Community • Private Gardens • Premium Amenities`,
      callToAction: 'Contact Us',
      headlineAr: `سكن عائلي راقي في ${params.community} | ${params.bedrooms} غرف نوم`,
      primaryTextAr: `اكتشف منزلك المثالي في ${params.community}. مجتمع متكامل قريب من أفضل المدارس والمراكز الترفيهية في دبي بسعر ${formattedPrice}. احجز موعدك لزيارة العقار.`,
      descriptionAr: `بيئة عائلية مثالية • حدائق خاصة وملاعب`,
      callToActionAr: 'احجز الآن',
      trakheesiDisclaimer: `${permitText} | DLD Registered Broker`,
    });
  }

  return {
    propertyTitle: params.propertyTitle,
    platform: params.platform,
    variations,
    suggestedHashtags: [
      '#DubaiRealEstate',
      `#${params.community.replace(/\s+/g, '')}`,
      '#LuxuryDubai',
      '#DubaiPropertyInvestment',
      '#GoldenVisaUAE',
      '#ApexProperties'
    ],
    targetAudienceKeywords: [
      'High Net Worth Individuals (HNWI)',
      'UAE Real Estate Investors',
      'Expat Relocation Dubai',
      'GCC Property Buyers',
      'Luxury Waterfront Living'
    ]
  };
}
