import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldOff } from 'lucide-react';

interface ComplianceBadgeProps {
  status: 'COMPLIANT' | 'INCOMPLETE' | 'EXPIRED' | 'ACTION_REQUIRED' | string;
  permitNo?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function ComplianceBadge({ status, permitNo, className = '', showIcon = true }: ComplianceBadgeProps) {
  switch (status) {
    case 'COMPLIANT':
      return (
        <Badge variant="success" className={className}>
          {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-[#16A36A]" />}
          <span>Trakheesi Compliant</span>
          {permitNo && <span className="text-[10px] opacity-75 font-mono">#{permitNo}</span>}
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge variant="danger" className={className}>
          {showIcon && <ShieldOff className="w-3.5 h-3.5 text-[#E05252]" />}
          <span>Permit Expired</span>
        </Badge>
      );
    case 'ACTION_REQUIRED':
      return (
        <Badge variant="warning" className={className}>
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />}
          <span>Action Required</span>
        </Badge>
      );
    case 'INCOMPLETE':
    default:
      return (
        <Badge variant="neutral" className={className}>
          {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-[#737B8C]" />}
          <span>Incomplete Permit</span>
        </Badge>
      );
  }
}
