export interface PropertyComplianceInput {
  title?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  builtUpArea?: number | null;
  community?: string | null;
  trakheesiPermitNo?: string | null;
  permitExpiryDate?: Date | string | null;
  qrCodeUrl?: string | null;
  formACompleted?: boolean | null;
  isOffPlan?: boolean | null;
  developerName?: string | null;
  escrowNumber?: string | null;
  completionDate?: Date | string | null;
}

export interface ComplianceValidationResult {
  status: 'COMPLIANT' | 'INCOMPLETE' | 'EXPIRED' | 'ACTION_REQUIRED';
  canLaunchCampaign: boolean;
  score: number; // 0 to 100
  issues: string[];
  warnings: string[];
  details: {
    hasPermit: boolean;
    isPermitValidDate: boolean;
    hasMadmounQR: boolean;
    isFormAConfirmed: boolean;
    hasOffPlanEscrow: boolean;
    hasMandatoryListingFields: boolean;
  };
}

export function validateTrakheesiCompliance(property: PropertyComplianceInput): ComplianceValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check mandatory listing fields
  const hasMandatoryListingFields = Boolean(
    property.title &&
    property.price &&
    property.price > 0 &&
    property.builtUpArea &&
    property.builtUpArea > 0 &&
    property.community
  );
  if (!hasMandatoryListingFields) {
    issues.push('Mandatory property details (title, price, area, community) are incomplete.');
  }

  // 1. Trakheesi Permit Check
  const permitNo = property.trakheesiPermitNo?.trim();
  const hasPermit = Boolean(permitNo && permitNo.length >= 5);
  if (!hasPermit) {
    issues.push('Missing official Trakheesi Permit Number.');
  }

  // 2. Expiry Date Check
  let isPermitValidDate = false;
  if (property.permitExpiryDate) {
    const expiryDate = new Date(property.permitExpiryDate);
    const now = new Date();
    if (isNaN(expiryDate.getTime())) {
      issues.push('Trakheesi permit expiry date format is invalid.');
    } else if (expiryDate < now) {
      issues.push(`Trakheesi permit expired on ${expiryDate.toLocaleDateString('en-GB')}. Renewal required.`);
    } else {
      isPermitValidDate = true;
      // Warning if expiring within 14 days
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 14) {
        warnings.push(`Trakheesi permit will expire in ${daysUntilExpiry} days.`);
      }
    }
  } else if (hasPermit) {
    issues.push('Permit expiration date is missing.');
  }

  // 3. Madmoun QR code check
  const hasMadmounQR = Boolean(property.qrCodeUrl && property.qrCodeUrl.trim().length > 0);
  if (!hasMadmounQR) {
    issues.push('Official Madmoun verification QR code is not uploaded or attached.');
  }

  // 4. Form A (Seller Agreement Confirmation)
  const isFormAConfirmed = Boolean(property.formACompleted);
  if (!isFormAConfirmed) {
    issues.push('Form A (Seller Agreement / Authority to Market) has not been confirmed.');
  }

  // 5. Off-Plan Validation
  let hasOffPlanEscrow = true;
  if (property.isOffPlan) {
    if (!property.developerName || property.developerName.trim().length === 0) {
      issues.push('Off-plan property requires approved Developer Name.');
      hasOffPlanEscrow = false;
    }
    if (!property.escrowNumber || property.escrowNumber.trim().length === 0) {
      issues.push('Off-plan property requires a DLD-registered Escrow Account Number.');
      hasOffPlanEscrow = false;
    }
    if (!property.completionDate) {
      warnings.push('Anticipated handover/completion date should be provided for off-plan marketing.');
    }
  }

  // Determine Overall Status
  let status: 'COMPLIANT' | 'INCOMPLETE' | 'EXPIRED' | 'ACTION_REQUIRED' = 'INCOMPLETE';
  let canLaunchCampaign = false;

  if (property.permitExpiryDate && new Date(property.permitExpiryDate) < new Date()) {
    status = 'EXPIRED';
  } else if (issues.length === 0) {
    status = 'COMPLIANT';
    canLaunchCampaign = true;
  } else if (hasPermit && isPermitValidDate && !hasMadmounQR) {
    status = 'ACTION_REQUIRED';
  } else {
    status = 'INCOMPLETE';
  }

  // Calculate score (0 to 100)
  let score = 0;
  if (hasMandatoryListingFields) score += 20;
  if (hasPermit) score += 20;
  if (isPermitValidDate) score += 20;
  if (hasMadmounQR) score += 20;
  if (isFormAConfirmed) score += 10;
  if (hasOffPlanEscrow) score += 10;

  return {
    status,
    canLaunchCampaign,
    score,
    issues,
    warnings,
    details: {
      hasPermit,
      isPermitValidDate,
      hasMadmounQR,
      isFormAConfirmed,
      hasOffPlanEscrow,
      hasMandatoryListingFields,
    },
  };
}
