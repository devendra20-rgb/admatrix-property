'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import {
  Users2,
  Search,
  Filter,
  MessageCircle,
  Phone,
  Mail,
  Building2,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';

export default function LeadsInboxPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // WhatsApp Chat Drawer State
  const [activeLead, setActiveLead] = useState<any | null>(null);
  const [waMessage, setWaMessage] = useState('');
  const [sendingWa, setSendingWa] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('dubai_property_lead_welcome_v1');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.data) {
        setLeads(data.data);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const openWhatsAppDrawer = async (lead: any) => {
    setActiveLead(lead);
    setWaMessage(
      `Hello ${lead.name}, thank you for reaching out regarding ${lead.property?.title || 'our Dubai luxury properties'}. Would you prefer an in-person viewing or a digital walkthrough video?`
    );

    // Refresh lead to get full messages
    try {
      const res = await fetch(`/api/leads/${lead.id}`);
      const data = await res.json();
      if (data.data) {
        setActiveLead(data.data);
      }
    } catch (err) {
      console.error('Error fetching lead details:', err);
    }
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !waMessage.trim()) return;

    setSendingWa(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: activeLead.id,
          message: waMessage,
          templateName: selectedTemplate,
        }),
      });

      if (res.ok) {
        const refresh = await fetch(`/api/leads/${activeLead.id}`);
        const data = await refresh.json();
        if (data.data) {
          setActiveLead(data.data);
          // Also update status to CONTACTED if it was NEW
          if (data.data.status === 'NEW') {
            await handleUpdateStatus(activeLead.id, 'CONTACTED');
          }
        }
        setWaMessage('');
      }
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err);
    } finally {
      setSendingWa(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        if (activeLead && activeLead.id === leadId) {
          setActiveLead((prev: any) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      search === '' ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase())) ||
      (l.property?.title && l.property.title.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'QUALIFIED':
        return <Badge variant="success">Qualified Buyer</Badge>;
      case 'INTERESTED':
        return <Badge variant="primary">Interested</Badge>;
      case 'CONTACTED':
        return <Badge variant="warning">Contacted</Badge>;
      case 'NEW':
        return <Badge variant="primary">New Inquiry</Badge>;
      case 'CONVERTED':
        return <Badge variant="success">Closed Deal</Badge>;
      case 'LOST':
        return <Badge variant="danger">Lost</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AppShell title="Lead CRM & WhatsApp Inbox" subtitle="Manage buyer inquiries, automate WhatsApp replies, and track pipeline status">
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8EAF0] shadow-card">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#737B8C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name, phone, or property..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#151923]"
            >
              <option value="ALL">All Statuses ({leads.length})</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#737B8C]">Loading lead records...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users2 className="w-8 h-8 text-[#737B8C] mx-auto opacity-50" />
              <div className="text-sm font-semibold text-[#151923]">No Leads Found</div>
              <p className="text-xs text-[#737B8C]">No buyer inquiries currently match the filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8EAF0] bg-[#FAFAFC] text-[11px] font-semibold text-[#737B8C] uppercase tracking-wider">
                    <th className="py-3 px-4">Lead Name</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Associated Property</th>
                    <th className="py-3 px-4">Ad Source</th>
                    <th className="py-3 px-4">Pipeline Status</th>
                    <th className="py-3 px-4">Assigned Broker</th>
                    <th className="py-3 px-4 text-right">Direct Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAF0] text-xs">
                  {filteredLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-[#F7F8FA] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#151923]">
                        {l.name}
                      </td>
                      <td className="py-3 px-4 text-[#737B8C]">
                        <div className="font-mono text-[#151923] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#16A36A]" /> {l.phone}
                        </div>
                        {l.email && (
                          <div className="text-[11px] text-[#737B8C] truncate max-w-xs">{l.email}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#151923] block truncate max-w-xs">
                          {l.property?.title || 'General Inbound'}
                        </span>
                        <span className="text-[11px] text-[#737B8C]">
                          {l.property?.community || 'Dubai'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm">
                          {l.sourcePlatform}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(l.status)}
                      </td>
                      <td className="py-3 px-4 text-[#737B8C]">
                        {l.assignedTo?.name || 'Hamdan Al Maktoum'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openWhatsAppDrawer(l)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#E7F7F0] hover:bg-[#D4F3E4] text-[#16A36A] transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Slide-over WhatsApp Drawer */}
        {activeLead && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#E8EAF0] flex items-center justify-between bg-[#F7F8FA]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#16A36A] text-white flex items-center justify-center font-bold text-sm">
                    {activeLead.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#151923]">{activeLead.name}</h3>
                    <p className="text-xs text-[#16A36A] font-mono">{activeLead.phone}</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveLead(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-[#737B8C]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Selector & Property Context */}
              <div className="p-3 bg-white border-b border-[#E8EAF0] flex items-center justify-between text-xs">
                <span className="text-[#737B8C]">Pipeline Status:</span>
                <select
                  value={activeLead.status}
                  onChange={(e) => handleUpdateStatus(activeLead.id, e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#F7F8FA] border border-[#E8EAF0] rounded-lg text-[#151923]"
                >
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>

              {/* Messages / Conversation Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F0F2F5]">
                {/* Simulated Lead Inbound */}
                <div className="flex flex-col items-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm text-xs text-[#151923] space-y-1">
                    <p>Hello, I submitted an inquiry about {activeLead.property?.title || 'the luxury property'}. Please send me the official DLD brochure and payment plan.</p>
                    <span className="text-[10px] text-[#737B8C] block text-right">Inbound Ad Inquiry</span>
                  </div>
                </div>

                {/* Logged Outbound Messages */}
                {activeLead.whatsappMessages &&
                  activeLead.whatsappMessages.map((msg: any) => (
                    <div key={msg.id} className="flex flex-col items-end">
                      <div className="bg-[#E7F7F0] border border-[#B7EBD4] p-3 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm text-xs text-[#151923] space-y-1">
                        <p>{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-[#16A36A]">
                          <span>{msg.templateName ? 'WhatsApp Template' : 'Delivered'}</span>
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Template Quick Select & Composer */}
              <div className="p-4 border-t border-[#E8EAF0] bg-white space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#737B8C] uppercase block">
                    Approved WhatsApp Business Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      if (e.target.value === 'dubai_vip_viewing_invitation_v1') {
                        setWaMessage(
                          `Dear ${activeLead.name}, we would like to invite you for a private VIP walkthrough of ${activeLead.property?.title || 'the residence'}. Which day this week suits your schedule?`
                        );
                      } else if (e.target.value === 'dubai_payment_plan_brochure_v1') {
                        setWaMessage(
                          `Dear ${activeLead.name}, here is the official DLD-registered escrow payment plan and floor plans for ${activeLead.property?.title || 'our listing'}. Let us know if you have any questions!`
                        );
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-lg"
                  >
                    <option value="dubai_property_lead_welcome_v1">dubai_property_lead_welcome_v1</option>
                    <option value="dubai_vip_viewing_invitation_v1">dubai_vip_viewing_invitation_v1</option>
                    <option value="dubai_payment_plan_brochure_v1">dubai_payment_plan_brochure_v1</option>
                  </select>
                </div>

                <form onSubmit={handleSendWhatsApp} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={waMessage}
                    onChange={(e) => setWaMessage(e.target.value)}
                    placeholder="Type official WhatsApp reply..."
                    className="flex-1 px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16A36A]"
                  />
                  <button
                    type="submit"
                    disabled={sendingWa || !waMessage.trim()}
                    className="p-2.5 rounded-xl bg-[#16A36A] hover:bg-[#138A5A] text-white transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
