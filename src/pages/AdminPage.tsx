import { useMemo, useState } from 'react';
import { Lock, LogOut, ShieldCheck } from 'lucide-react';
import { useWds } from '../contexts/WdsContext';
import { AdminOverview } from '../components/admin/AdminOverview';
import { ModerationQueues } from '../components/admin/ModerationQueues';
import { NewsManager } from '../components/admin/NewsManager';
import { DebateManager } from '../components/admin/DebateManager';
import { WritersManager } from '../components/admin/WritersManager';
import { CategoriesMediaManager } from '../components/admin/CategoriesMediaManager';
import { RecognitionAnnouncementsManager } from '../components/admin/RecognitionAnnouncementsManager';
import { GovernanceAdminManager } from '../components/admin/GovernanceAdminManager';

export function AdminPage() {
  const { authReady, firebaseUser, adminUser, adminDeniedReason, signInAdmin, signOutAdmin } = useWds();
  const [activeTab, setActiveTab] = useState('overview');
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const allowedTabs = useMemo(() => {
    if (!adminUser) return [];
    const role = adminUser.role;
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'moderation', label: 'Moderation Queues' },
    ];
    if (role === 'SUPER_ADMIN' || role === 'EDITOR') {
      tabs.push(
        { id: 'news', label: 'Newsroom' },
        { id: 'debates', label: 'Debates' },
        { id: 'writers', label: 'Writers' },
        { id: 'categories', label: 'Categories & Media' },
        { id: 'recognition', label: 'Recognition & Notices' }
      );
    }
    if (role === 'SUPER_ADMIN') {
      tabs.push({ id: 'governance', label: 'Governance & Audit' });
    }
    return tabs;
  }, [adminUser]);

  const handleSignIn = async () => {
    setSignInError(null);
    setSigningIn(true);
    try {
      await signInAdmin();
    } catch (err: any) {
      setSignInError(err?.message || 'Sign-in was cancelled or could not be completed.');
    } finally {
      setSigningIn(false);
    }
  };

  if (!authReady) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-sm text-[#5C626F] dark:text-slate-400">
        Verifying administrator session...
      </div>
    );
  }

  // Protected Admin Gate
  if (!firebaseUser || !adminUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 sm:py-24">
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-8 sm:p-10 space-y-6">
          <div className="flex items-center gap-2.5 text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
            <Lock className="w-4 h-4" />
            <span>Restricted Editorial Console</span>
          </div>

          <div>
            <h1 className="font-serif text-3xl font-bold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
              WDS Administrator Sign-In
            </h1>
            <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
              Access is restricted to authorized WDS officers (Super Admin, Editors, and Moderators). Public registration is disabled; visitors do not require an account to read or submit work.
            </p>
          </div>

          {adminDeniedReason && (
            <div className="p-4 border border-[#9A3412]/30 bg-rose-50/60 dark:bg-rose-950/20 text-xs text-[#9A3412] dark:text-rose-300 space-y-2">
              <p>{adminDeniedReason}</p>
              {firebaseUser && (
                <p className="font-mono-tabular text-[11px] opacity-80">
                  Signed in as: {firebaseUser.email}
                </p>
              )}
            </div>
          )}

          {signInError && (
            <p className="text-xs text-[#9A3412] dark:text-rose-300">{signInError}</p>
          )}

          <div className="space-y-3 pt-2">
            {!firebaseUser ? (
              <button
                type="button"
                disabled={signingIn}
                onClick={handleSignIn}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {signingIn ? 'Signing in...' : 'Sign in with Authorized Google Account'}
              </button>
            ) : (
              <button
                type="button"
                onClick={signOutAdmin}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-medium border border-[#0B1528] dark:border-[#C9A458] text-[#0B1528] dark:text-[#C9A458] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign out and switch account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Top Header */}
      <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D32] dark:text-[#C9A458] mb-1">
            WDS Editorial & Moderation Console · {adminUser.role.replace('_', ' ')}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">
            Administration Desk
          </h1>
          <p className="text-xs text-[#5C626F] dark:text-slate-400 mt-1">
            Signed in as {adminUser.displayName} ({adminUser.email})
          </p>
        </div>

        <button
          type="button"
          onClick={signOutAdmin}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528] self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      {/* Role-Aware Module Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#D8D3C8] dark:border-slate-800">
        {allowedTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#B68D40] text-[#0B1528] dark:text-[#C9A458] font-semibold'
                : 'border-transparent text-[#5C626F] dark:text-slate-400 hover:text-[#0B1528]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Admin Module */}
      <div>
        {activeTab === 'overview' && <AdminOverview onNavigateTab={setActiveTab} />}
        {activeTab === 'moderation' && <ModerationQueues />}
        {activeTab === 'news' && <NewsManager />}
        {activeTab === 'debates' && <DebateManager />}
        {activeTab === 'writers' && <WritersManager />}
        {activeTab === 'categories' && <CategoriesMediaManager />}
        {activeTab === 'recognition' && <RecognitionAnnouncementsManager />}
        {activeTab === 'governance' && <GovernanceAdminManager />}
      </div>
    </div>
  );
}
