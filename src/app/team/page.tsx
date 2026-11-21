'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Plus,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Building2,
  UserPlus,
  Settings2,
} from 'lucide-react';

export default function TeamManagementPage() {
  const [agents, setAgents] = useState([
    {
      id: '1',
      name: 'Hamdan Al Maktoum',
      email: 'hamdan@apexluxury.ae',
      phone: '+971 50 123 4567',
      role: 'BROKERAGE_ADMIN',
      activeListings: 8,
      assignedLeads: 42,
      brnNumber: 'BRN-48910',
    },
    {
      id: '2',
      name: 'Sarah Jenkins',
      email: 'sarah.j@apexluxury.ae',
      phone: '+971 52 987 6543',
      role: 'BROKER',
      activeListings: 4,
      assignedLeads: 26,
      brnNumber: 'BRN-51204',
    },
    {
      id: '3',
      name: 'Rashid Al Nuaimi',
      email: 'rashid.n@apexluxury.ae',
      phone: '+971 55 765 4321',
      role: 'BROKER',
      activeListings: 3,
      assignedLeads: 18,
      brnNumber: 'BRN-53902',
    },
  ]);

  const [requireApproval, setRequireApproval] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('BROKER');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    setAgents((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: inviteName,
        email: inviteEmail,
        phone: '+971 50 000 0000',
        role: inviteRole,
        activeListings: 0,
        assignedLeads: 0,
        brnNumber: 'BRN-PENDING',
      },
    ]);

    setInviteName('');
    setInviteEmail('');
    setInviteModal(false);
  };

  return (
    <AppShell title="Brokerage & Team" subtitle="Manage agent roster, roles, lead distribution, and campaign approval gates">
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF0] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0EFFF] text-[#635BFF] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151923]">Apex Luxury Properties Dubai</h3>
              <p className="text-xs text-[#737B8C]">RERA Office Registration: #19482 • Trade License: CN-894721</p>
            </div>
          </div>

          <button
            onClick={() => setInviteModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Agent</span>
          </button>
        </div>

        {/* Approval Workflow Toggle */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF0] shadow-card flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E7F7F0] text-[#16A36A] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#151923]">Brokerage Campaign Approval Workflow</div>
              <p className="text-[11px] text-[#737B8C] mt-0.5">
                When enabled, junior brokers must request Brokerage Admin sign-off before publishing campaigns to Meta & Google.
              </p>
            </div>
          </div>

          <button
            onClick={() => setRequireApproval(!requireApproval)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              requireApproval ? 'bg-[#635BFF]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                requireApproval ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Team Roster Table */}
        <div className="bg-white rounded-2xl border border-[#E8EAF0] shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E8EAF0]">
            <h3 className="text-sm font-semibold text-[#151923]">Registered Agents ({agents.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8EAF0] bg-[#FAFAFC] text-[11px] font-semibold text-[#737B8C] uppercase">
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">RERA BRN</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Active Listings</th>
                  <th className="py-3 px-4">Assigned Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EAF0]">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#151923]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#151923] text-white flex items-center justify-center font-bold text-[10px]">
                          {a.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{a.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#737B8C]">
                      <div>{a.email}</div>
                      <div className="text-[11px] font-mono text-[#151923]">{a.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#151923]">
                      {a.brnNumber}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={a.role === 'BROKERAGE_ADMIN' ? 'primary' : 'neutral'} size="sm">
                        {a.role === 'BROKERAGE_ADMIN' ? 'Brokerage Admin' : 'Agent'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#151923] font-semibold">
                      {a.activeListings}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#16A36A]">
                      {a.assignedLeads}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Modal */}
        {inviteModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-[#151923]">Invite New Real Estate Agent</h3>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Full Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Omar Mansoori"
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Corporate Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. omar@apexluxury.ae"
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#151923]">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-[#151923]"
                  >
                    <option value="BROKER">Broker / Agent</option>
                    <option value="BROKERAGE_ADMIN">Brokerage Admin</option>
                  </select>
                </div>
                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#737B8C] hover:text-[#151923]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
