import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Shield, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useWds } from '../../contexts/WdsContext';
import { formatEditorialDate, makeUniqueId, sanitizeMultilineText, sanitizePlainText } from '../../lib/sanitize';
import { AdminRole } from '../../types/wds';

export function GovernanceAdminManager() {
  const { adminUser, adminUsers, adminInvites, auditLogs, platformConfig, logAudit } = useWds();

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('EDITOR');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  // About & Settings form
  const [debateCycleDays, setDebateCycleDays] = useState(platformConfig.debateCycleDays);
  const [aboutIntro, setAboutIntro] = useState(platformConfig.aboutIntro);
  const [mission, setMission] = useState(platformConfig.mission);
  const [vision, setVision] = useState(platformConfig.vision);
  const [objectives, setObjectives] = useState(platformConfig.objectives);
  const [editorialValues, setEditorialValues] = useState(platformConfig.editorialValues);
  const [participationGuidelines, setParticipationGuidelines] = useState(platformConfig.participationGuidelines);
  const [contactEmail, setContactEmail] = useState(platformConfig.contactEmail);
  const [contactLocation, setContactLocation] = useState(platformConfig.contactLocation);
  const [contactHours, setContactHours] = useState(platformConfig.contactHours);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  if (adminUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-8 text-sm text-[#5C626F] dark:text-slate-400">
        Super Admin permissions are required to manage administrator roles and platform governance settings.
      </div>
    );
  }

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg(null);
    const cleanEmail = sanitizePlainText(inviteEmail).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setInviteMsg('Enter a valid Google account email.');
      return;
    }
    const id = makeUniqueId('inv');
    try {
      await setDoc(doc(db, 'adminInvites', id), {
        email: cleanEmail,
        displayName: sanitizePlainText(inviteName || 'WDS Officer').slice(0, 120),
        role: inviteRole,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: adminUser.uid,
      });
      await logAudit('ADMIN_INVITE', 'adminInvites', id, `Pre-authorized ${cleanEmail} as ${inviteRole}.`);
      setInviteEmail('');
      setInviteName('');
      setInviteMsg(`Invitation saved for ${cleanEmail}. They will receive ${inviteRole} access when signing in at /admin.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `adminInvites/${id}`);
    }
  };

  const updateAdminRole = async (uid: string, role: AdminRole, active: boolean, email: string) => {
    try {
      await updateDoc(doc(db, 'admins', uid), {
        role,
        active,
        updatedAt: serverTimestamp(),
      });
      await logAudit('PERMISSION_CHANGE', 'admins', uid, `Updated ${email} to ${role} (${active ? 'active' : 'inactive'}).`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `admins/${uid}`);
    }
  };

  const revokeInvite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'adminInvites', id));
      await logAudit('INVITE_REVOKE', 'adminInvites', id, `Revoked pending admin invite ${id}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `adminInvites/${id}`);
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);
    try {
      await setDoc(doc(db, 'platform_config', 'main'), {
        ...platformConfig,
        debateCycleDays: Math.max(1, Math.min(60, Number(debateCycleDays) || 3)),
        aboutIntro: sanitizeMultilineText(aboutIntro).slice(0, 2000),
        mission: sanitizeMultilineText(mission).slice(0, 1500),
        vision: sanitizeMultilineText(vision).slice(0, 1500),
        objectives: sanitizeMultilineText(objectives).slice(0, 2500),
        editorialValues: sanitizeMultilineText(editorialValues).slice(0, 2500),
        participationGuidelines: sanitizeMultilineText(participationGuidelines).slice(0, 2500),
        contactEmail: sanitizePlainText(contactEmail).slice(0, 200),
        contactLocation: sanitizePlainText(contactLocation).slice(0, 250),
        contactHours: sanitizePlainText(contactHours).slice(0, 200),
        updatedAt: serverTimestamp(),
        updatedBy: adminUser.uid,
      });
      await logAudit('SETTINGS_UPDATE', 'platform_config', 'main', 'Updated About WDS copy, contact details, and debate cycle days.');
      setSettingsMsg('Platform governance settings saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'platform_config/main');
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Users & Pre-Authorized Invites */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-[#8C6D32] dark:text-[#C9A458]" />
            <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
              Authorize Administrator
            </h2>
          </div>
          <p className="text-xs text-[#5C626F] dark:text-slate-400">
            There is no public admin registration. Only Google accounts explicitly pre-authorized below may access the Admin Console.
          </p>
          <form onSubmit={handleInviteAdmin} className="space-y-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Google Email Address *"
              className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Display Name / Office"
              className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AdminRole)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            >
              <option value="EDITOR">EDITOR (News, Writers, Categories, Debates)</option>
              <option value="MODERATOR">MODERATOR (Review Queues & Reports)</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN (Full Access)</option>
            </select>
            {inviteMsg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{inviteMsg}</p>}
            <button type="submit" className="w-full py-2.5 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer">
              Create Admin Authorization
            </button>
          </form>

          {adminInvites.filter((i) => i.active).length > 0 && (
            <div className="pt-3 border-t border-[#ECE8DF] dark:border-slate-800 space-y-2 text-xs">
              <p className="uppercase tracking-wider text-[#5C626F]">Pending Invites</p>
              {adminInvites
                .filter((i) => i.active)
                .map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <span>{inv.email} ({inv.role})</span>
                    <button type="button" onClick={() => revokeInvite(inv.id)} className="text-[#9A3412] p-1 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            Active Administrators
          </h2>
          <div className="divide-y divide-[#ECE8DF] dark:divide-slate-800 text-xs">
            {adminUsers.map((u) => (
              <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#0B1528] dark:text-[#F1EFEA]">{u.displayName}</p>
                  <p className="text-[#5C626F] dark:text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    disabled={u.uid === adminUser.uid}
                    onChange={(e) => updateAdminRole(u.uid, e.target.value as AdminRole, u.active, u.email)}
                    className="px-2.5 py-1.5 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="MODERATOR">MODERATOR</option>
                  </select>
                  {u.uid !== adminUser.uid && (
                    <button
                      type="button"
                      onClick={() => updateAdminRole(u.uid, u.role, !u.active, u.email)}
                      className="px-2.5 py-1.5 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer"
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About WDS & Platform Settings */}
      <form onSubmit={handleSavePlatformSettings} className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
        <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
          About WDS, School Contact & Schedule Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block mb-1 text-[#5C626F]">Default Debate Cycle (Days)</label>
            <input type="number" min={1} max={60} value={debateCycleDays} onChange={(e) => setDebateCycleDays(Number(e.target.value))} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
          <div>
            <label className="block mb-1 text-[#5C626F]">Editorial Contact Email</label>
            <input type="text" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
          <div>
            <label className="block mb-1 text-[#5C626F]">Campus Location</label>
            <input type="text" value={contactLocation} onChange={(e) => setContactLocation(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
          <div>
            <label className="block mb-1 text-[#5C626F]">Editorial Hours</label>
            <input type="text" value={contactHours} onChange={(e) => setContactHours(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block mb-1 text-[#5C626F]">About Introduction</label>
            <textarea rows={3} value={aboutIntro} onChange={(e) => setAboutIntro(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
          <div>
            <label className="block mb-1 text-[#5C626F]">Mission & Vision</label>
            <textarea rows={2} value={mission} onChange={(e) => setMission(e.target.value)} className="w-full mb-2 px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
            <textarea rows={2} value={vision} onChange={(e) => setVision(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
          <div>
            <label className="block mb-1 text-[#5C626F]">Objectives & Values</label>
            <textarea rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} className="w-full mb-2 px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
            <textarea rows={2} value={editorialValues} onChange={(e) => setEditorialValues(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
          <div>
            <label className="block mb-1 text-[#5C626F]">Participation Guidelines</label>
            <textarea rows={5} value={participationGuidelines} onChange={(e) => setParticipationGuidelines(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
        </div>
        {settingsMsg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{settingsMsg}</p>}
        <button type="submit" className="px-5 py-2.5 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer">
          Save Governance Settings
        </button>
      </form>

      {/* Immutable Audit Logs */}
      <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
        <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
          Immutable Audit Trail ({auditLogs.length})
        </h2>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D8D3C8] dark:border-slate-800 text-[#5C626F] uppercase">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Administrator</th>
                <th className="py-2">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE8DF] dark:divide-slate-800">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2 pr-4 font-mono-tabular whitespace-nowrap text-[#5C626F] dark:text-slate-400">
                    {formatEditorialDate(log.createdAt)}
                  </td>
                  <td className="py-2 pr-4 font-mono-tabular font-semibold text-[#0B1528] dark:text-[#C9A458]">
                    {log.action}
                  </td>
                  <td className="py-2 pr-4 text-[#4A4F5A] dark:text-slate-300">
                    {log.actorEmail} ({log.actorRole})
                  </td>
                  <td className="py-2 text-[#242833] dark:text-slate-200">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
