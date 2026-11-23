'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import {
  Layers,
  Instagram,
  Globe2,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Power,
} from 'lucide-react';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([
    {
      id: 'meta',
      name: 'Meta Marketing API',
      description: 'Connect Instagram & Facebook Ad Accounts to automatically deploy image and carousel campaigns.',
      icon: Instagram,
      iconColor: 'text-[#E1306C]',
      status: 'CONNECTED',
      accountName: 'Apex Luxury Properties (Act #782910)',
    },
    {
      id: 'google',
      name: 'Google Ads API',
      description: 'Automate high-intent Google Search, Performance Max, and YouTube Discovery campaigns.',
      icon: Globe2,
      iconColor: 'text-[#4285F4]',
      status: 'CONNECTED',
      accountName: 'Apex Properties MCC (CID: 489-102-491)',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business Cloud API',
      description: 'Official Meta WhatsApp Business Platform for instant lead routing, alerts, and template messaging.',
      icon: MessageCircle,
      iconColor: 'text-[#16A36A]',
      status: 'CONNECTED',
      accountName: '+971 4 398 7700 (Verified Green Badge)',
    },
    {
      id: 'dld',
      name: 'Dubai Land Department (DLD) Trakheesi',
      description: 'Permit verification engine with Madmoun QR code validation and Form A compliance checks.',
      icon: ShieldCheck,
      iconColor: 'text-[#16A36A]',
      status: 'ACTIVE_GUARD',
      accountName: 'DLD Electronic Services Gateway',
    },
  ]);

  const toggleStatus = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = item.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
          return { ...item, status: next };
        }
        return item;
      })
    );
  };

  return (
    <AppShell
      title="Integrations & APIs"
      subtitle="Manage external channels for Meta, Google, WhatsApp, and DLD compliance"
      requiredRoles={['SUPER_ADMIN', 'BROKERAGE_ADMIN']}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((item) => {
            const Icon = item.icon;
            const isConnected = item.status === 'CONNECTED' || item.status === 'ACTIVE_GUARD';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card p-6 flex flex-col justify-between space-y-4 hover:shadow-elevated transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7F8FA] border border-[#E8EAF0] flex items-center justify-center shrink-0">
                      <Icon className={`w-6 h-6 ${item.iconColor}`} />
                    </div>
                    <Badge variant={isConnected ? 'success' : 'neutral'}>
                      {isConnected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Connected</span>
                        </>
                      ) : (
                        <span>Disconnected</span>
                      )}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-[#151923] mb-1">{item.name}</h3>
                  <p className="text-xs text-[#737B8C] leading-relaxed mb-3">{item.description}</p>

                  <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E8EAF0] text-xs">
                    <span className="text-[11px] text-[#737B8C] block mb-0.5">Connected Identity</span>
                    <span className="font-semibold text-[#151923]">{item.accountName}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8EAF0] flex items-center justify-between">
                  <span className="text-[11px] text-[#16A36A] font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#16A36A]" />
                    OAuth 2.0 Synced
                  </span>

                  <button
                    onClick={() => toggleStatus(item.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      isConnected
                        ? 'border-[#E8EAF0] text-[#737B8C] hover:text-[#E05252] hover:bg-[#FDEEEC]'
                        : 'bg-[#635BFF] text-white border-[#635BFF]'
                    }`}
                  >
                    {isConnected ? 'Disconnect' : 'Connect Account'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

