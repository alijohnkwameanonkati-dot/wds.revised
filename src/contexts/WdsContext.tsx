import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  DEFAULT_MEDIA_ASSETS,
  DEFAULT_NEWS_CATEGORIES,
  DEFAULT_PLATFORM_CONFIG,
  DEFAULT_WRITER_CATEGORIES,
} from '../lib/defaults';
import { getOrCreateClientToken, toMillis } from '../lib/sanitize';
import {
  AdminInvite,
  AdminUser,
  Announcement,
  ArgumentReply,
  AuditLog,
  Category,
  ContentReport,
  DebateArgument,
  DebateTopic,
  MediaAsset,
  ModerationRecord,
  MonthlyRecognition,
  NewsArticle,
  NewsletterSubscriber,
  PlatformConfig,
  WritingWork,
} from '../types/wds';

const BOOTSTRAP_ADMIN_EMAIL = 'v1o2r0t6e1x0@gmail.com';
const VOTED_STORAGE_KEY = 'wds_voted_items_v1';

interface WdsContextValue {
  // Public state
  loadingPublic: boolean;
  categories: Category[];
  newsCategories: Category[];
  writerCategories: Category[];
  publishedNews: NewsArticle[];
  publishedWritings: WritingWork[];
  debates: DebateTopic[];
  approvedArguments: DebateArgument[];
  approvedReplies: ArgumentReply[];
  announcements: Announcement[];
  recognitions: MonthlyRecognition[];
  mediaLibrary: MediaAsset[];
  platformConfig: PlatformConfig;
  votedKeys: Set<string>;
  castVote: (targetType: 'news' | 'writing' | 'argument', targetId: string) => Promise<'voted' | 'already_voted'>;

  // Auth & Admin state
  firebaseUser: User | null;
  authReady: boolean;
  adminUser: AdminUser | null;
  adminDeniedReason: string | null;
  signInAdmin: () => Promise<void>;
  signOutAdmin: () => Promise<void>;

  // Admin collections (only populated for verified active admins)
  allNews: NewsArticle[];
  allWritings: WritingWork[];
  allArguments: DebateArgument[];
  allReplies: ArgumentReply[];
  reports: ContentReport[];
  moderationRecords: ModerationRecord[];
  auditLogs: AuditLog[];
  adminUsers: AdminUser[];
  adminInvites: AdminInvite[];
  subscribers: NewsletterSubscriber[];
  logAudit: (action: string, targetType: string, targetId: string, summary: string) => Promise<void>;
}

const WdsContext = createContext<WdsContextValue | undefined>(undefined);

function loadVotedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveVotedSet(set: Set<string>) {
  try {
    localStorage.setItem(VOTED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage issues
  }
}

export function WdsProvider({ children }: { children: React.ReactNode }) {
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [firestoreCategories, setFirestoreCategories] = useState<Category[]>([]);
  const [publishedNews, setPublishedNews] = useState<NewsArticle[]>([]);
  const [publishedWritings, setPublishedWritings] = useState<WritingWork[]>([]);
  const [debates, setDebates] = useState<DebateTopic[]>([]);
  const [approvedArguments, setApprovedArguments] = useState<DebateArgument[]>([]);
  const [approvedReplies, setApprovedReplies] = useState<ArgumentReply[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recognitions, setRecognitions] = useState<MonthlyRecognition[]>([]);
  const [firestoreMedia, setFirestoreMedia] = useState<MediaAsset[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [votedKeys, setVotedKeys] = useState<Set<string>>(() => loadVotedSet());

  // Auth & Admin state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminDeniedReason, setAdminDeniedReason] = useState<string | null>(null);

  // Admin-only collections
  const [allNews, setAllNews] = useState<NewsArticle[]>([]);
  const [allWritings, setAllWritings] = useState<WritingWork[]>([]);
  const [allArguments, setAllArguments] = useState<DebateArgument[]>([]);
  const [allReplies, setAllReplies] = useState<ArgumentReply[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [moderationRecords, setModerationRecords] = useState<ModerationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminInvites, setAdminInvites] = useState<AdminInvite[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);

  // ---------------------------------------------------------------------------
  // 1. Public Real-Time Subscriptions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    let resolvedCount = 0;
    const markResolved = () => {
      resolvedCount += 1;
      if (resolvedCount >= 4) setLoadingPublic(false);
    };

    unsubs.push(
      onSnapshot(
        collection(db, 'categories'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
          items.sort((a, b) => a.order - b.order);
          setFirestoreCategories(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'news'), where('status', '==', 'published')),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NewsArticle, 'id'>) }));
          items.sort((a, b) => toMillis(b.publishedAt || b.createdAt) - toMillis(a.publishedAt || a.createdAt));
          setPublishedNews(items);
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'news')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'writings'), where('status', '==', 'published')),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WritingWork, 'id'>) }));
          items.sort((a, b) => toMillis(b.publishedAt || b.createdAt) - toMillis(a.publishedAt || a.createdAt));
          setPublishedWritings(items);
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'writings')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'debates'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DebateTopic, 'id'>) }));
          items.sort((a, b) => toMillis(b.openDate || b.createdAt) - toMillis(a.openDate || a.createdAt));
          setDebates(items);
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'debates')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'arguments'), where('status', '==', 'approved')),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DebateArgument, 'id'>) }));
          items.sort((a, b) => b.supportCount - a.supportCount || toMillis(b.createdAt) - toMillis(a.createdAt));
          setApprovedArguments(items);
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'arguments')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'replies'), where('status', '==', 'approved')),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ArgumentReply, 'id'>) }));
          items.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
          setApprovedReplies(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'replies')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'announcements'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }));
          items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
          setAnnouncements(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'recognitions'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MonthlyRecognition, 'id'>) }));
          items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
          setRecognitions(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'recognitions')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'media_library'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MediaAsset, 'id'>) }));
          setFirestoreMedia(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'media_library')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'platform_config', 'main'),
        (snap) => {
          if (snap.exists()) {
            setPlatformConfig({ id: snap.id, ...(snap.data() as Omit<PlatformConfig, 'id'>) });
          } else {
            setPlatformConfig(DEFAULT_PLATFORM_CONFIG);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'platform_config/main')
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Auth State & Admin Role Resolution
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAdminDeniedReason(null);

      if (!user) {
        setAdminUser(null);
        setAuthReady(true);
        return;
      }

      if (!user.emailVerified || !user.email) {
        setAdminUser(null);
        setAdminDeniedReason('A verified email address is required for administrator access.');
        setAuthReady(true);
        return;
      }

      try {
        const adminRef = doc(db, 'admins', user.uid);
        const snap = await getDoc(adminRef);

        if (snap.exists()) {
          const data = { id: snap.id, ...(snap.data() as Omit<AdminUser, 'id'>) };
          if (!data.active) {
            setAdminUser(null);
            setAdminDeniedReason('Your administrator account has been deactivated by a Super Admin.');
          } else {
            setAdminUser(data);
          }
          setAuthReady(true);
          return;
        }

        // Check bootstrap Super Admin
        if (user.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
          const newAdmin = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'WDS Super Admin',
            role: 'SUPER_ADMIN' as const,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
          };
          await setDoc(adminRef, newAdmin);
          const createdSnap = await getDoc(adminRef);
          if (createdSnap.exists()) {
            setAdminUser({ id: createdSnap.id, ...(createdSnap.data() as Omit<AdminUser, 'id'>) });
          }
          setAuthReady(true);
          return;
        }

        // Check active Admin Invite for verified email
        const inviteQ = query(
          collection(db, 'adminInvites'),
          where('email', '==', user.email)
        );
        const inviteSnaps = await getDocs(inviteQ);
        const activeInviteDoc = inviteSnaps.docs.find((d) => d.data().active === true);
        if (activeInviteDoc) {
          const inviteData = activeInviteDoc.data() as Omit<AdminInvite, 'id'>;
          await setDoc(adminRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || inviteData.displayName || 'WDS Administrator',
            role: inviteData.role,
            active: true,
            inviteId: activeInviteDoc.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: inviteData.createdBy,
          });
          await updateDoc(doc(db, 'adminInvites', activeInviteDoc.id), {
            active: false,
          });
          const claimedSnap = await getDoc(adminRef);
          if (claimedSnap.exists()) {
            setAdminUser({ id: claimedSnap.id, ...(claimedSnap.data() as Omit<AdminUser, 'id'>) });
          }
          setAuthReady(true);
          return;
        }

        setAdminUser(null);
        setAdminDeniedReason(
          'This Google account is not authorized for WDS administration. Public visitors do not need an account to read or submit work.'
        );
      } catch (err) {
        setAdminUser(null);
        handleFirestoreError(err, OperationType.GET, `admins/${user.uid}`);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // ---------------------------------------------------------------------------
  // 3. Admin-Only Real-Time Subscriptions (only attached when verified active admin)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!authReady || !adminUser || !adminUser.active) {
      setAllNews([]);
      setAllWritings([]);
      setAllArguments([]);
      setAllReplies([]);
      setReports([]);
      setModerationRecords([]);
      setAuditLogs([]);
      setAdminUsers([]);
      setAdminInvites([]);
      setSubscribers([]);
      return;
    }

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'news'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NewsArticle, 'id'>) }));
          items.sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));
          setAllNews(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'news')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'writings'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WritingWork, 'id'>) }));
          items.sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));
          setAllWritings(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'writings')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'arguments'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DebateArgument, 'id'>) }));
          items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
          setAllArguments(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'arguments')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'replies'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ArgumentReply, 'id'>) }));
          items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
          setAllReplies(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'replies')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'reports'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContentReport, 'id'>) }));
          items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
          setReports(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'moderation_records'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ModerationRecord, 'id'>) }));
          items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
          setModerationRecords(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'moderation_records')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'audit_logs'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) }));
          items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
          setAuditLogs(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
      )
    );

    if (adminUser.role === 'SUPER_ADMIN') {
      unsubs.push(
        onSnapshot(
          collection(db, 'admins'),
          (snap) => {
            setAdminUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminUser, 'id'>) })));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'adminInvites'),
          (snap) => {
            setAdminInvites(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminInvite, 'id'>) })));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'adminInvites')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'newsletter_subscribers'),
          (snap) => {
            setSubscribers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NewsletterSubscriber, 'id'>) })));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'newsletter_subscribers')
        )
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, adminUser]);

  const logAudit = useCallback(
    async (action: string, targetType: string, targetId: string, summary: string) => {
      if (!adminUser) return;
      try {
        await setDoc(doc(collection(db, 'audit_logs')), {
          action: action.slice(0, 80),
          targetType: targetType.slice(0, 60),
          targetId: targetId.slice(0, 128),
          summary: summary.slice(0, 400),
          actorUid: adminUser.uid,
          actorEmail: adminUser.email,
          actorRole: adminUser.role,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'audit_logs');
      }
    },
    [adminUser]
  );

  const signInAdmin = useCallback(async () => {
    setAdminDeniedReason(null);
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user && res.user.emailVerified) {
      // Login event logged if admin doc exists
      const snap = await getDoc(doc(db, 'admins', res.user.uid));
      if (snap.exists() && snap.data().active) {
        await setDoc(doc(collection(db, 'audit_logs')), {
          action: 'ADMIN_LOGIN',
          targetType: 'session',
          targetId: res.user.uid,
          summary: `Administrator signed in (${res.user.email}).`,
          actorUid: res.user.uid,
          actorEmail: res.user.email || '',
          actorRole: snap.data().role || 'ADMIN',
          createdAt: serverTimestamp(),
        });
      }
    }
  }, []);

  const signOutAdmin = useCallback(async () => {
    await signOut(auth);
    setAdminUser(null);
    setAdminDeniedReason(null);
  }, []);

  const castVote = useCallback(
    async (targetType: 'news' | 'writing' | 'argument', targetId: string): Promise<'voted' | 'already_voted'> => {
      const clientToken = getOrCreateClientToken();
      const voteKey = `${targetType}_${targetId}`;
      const voteDocId = `${targetType}_${targetId}_${clientToken}`.replace(/[^a-zA-Z0-9_-]/g, '');

      if (votedKeys.has(voteKey)) {
        return 'already_voted';
      }

      const voteRef = doc(db, 'votes', voteDocId);
      const collectionName =
        targetType === 'news' ? 'news' : targetType === 'writing' ? 'writings' : 'arguments';
      const countField = targetType === 'argument' ? 'supportCount' : 'likesCount';
      const targetRef = doc(db, collectionName, targetId);

      try {
        const existingVote = await getDoc(voteRef);
        if (existingVote.exists()) {
          const next = new Set(votedKeys);
          next.add(voteKey);
          setVotedKeys(next);
          saveVotedSet(next);
          return 'already_voted';
        }

        const batch = writeBatch(db);
        batch.set(voteRef, {
          targetType,
          targetId,
          clientToken,
          createdAt: serverTimestamp(),
        });
        batch.update(targetRef, {
          [countField]: increment(1),
        });
        await batch.commit();

        const next = new Set(votedKeys);
        next.add(voteKey);
        setVotedKeys(next);
        saveVotedSet(next);
        return 'voted';
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${targetId}`);
      }
    },
    [votedKeys]
  );

  const categories = useMemo(() => {
    if (firestoreCategories.length > 0) return firestoreCategories.filter((c) => c.active);
    return [...DEFAULT_NEWS_CATEGORIES, ...DEFAULT_WRITER_CATEGORIES];
  }, [firestoreCategories]);

  const newsCategories = useMemo(() => categories.filter((c) => c.pillar === 'news'), [categories]);
  const writerCategories = useMemo(() => categories.filter((c) => c.pillar === 'writers'), [categories]);

  const mediaLibrary = useMemo(() => {
    if (firestoreMedia.length > 0) return firestoreMedia;
    return DEFAULT_MEDIA_ASSETS.map((a) => ({ ...a, createdAt: null, createdBy: 'system' }));
  }, [firestoreMedia]);

  const value: WdsContextValue = {
    loadingPublic,
    categories,
    newsCategories,
    writerCategories,
    publishedNews,
    publishedWritings,
    debates,
    approvedArguments,
    approvedReplies,
    announcements,
    recognitions,
    mediaLibrary,
    platformConfig,
    votedKeys,
    castVote,
    firebaseUser,
    authReady,
    adminUser,
    adminDeniedReason,
    signInAdmin,
    signOutAdmin,
    allNews,
    allWritings,
    allArguments,
    allReplies,
    reports,
    moderationRecords,
    auditLogs,
    adminUsers,
    adminInvites,
    subscribers,
    logAudit,
  };

  return <WdsContext.Provider value={value}>{children}</WdsContext.Provider>;
}

export function useWds() {
  const ctx = useContext(WdsContext);
  if (!ctx) throw new Error('useWds must be used within WdsProvider');
  return ctx;
}
