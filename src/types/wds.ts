export type AdminRole = 'SUPER_ADMIN' | 'EDITOR' | 'MODERATOR';

export type ContentStatus =
  | 'pending'
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'archived'
  | 'rejected'
  | 'changes_requested';

export type DebateStatus = 'upcoming' | 'active' | 'closed' | 'archived';
export type ArgumentPosition = 'FOR' | 'AGAINST' | 'NEUTRAL';
export type ArgumentStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type ReplyStatus = 'pending' | 'approved' | 'rejected';

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt: any;
  updatedAt: any;
  createdBy?: string;
  inviteId?: string;
}

export interface AdminInvite {
  id: string;
  email: string;
  role: AdminRole;
  displayName: string;
  active: boolean;
  createdAt: any;
  createdBy: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  pillar: 'news' | 'writers';
  description?: string;
  order: number;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  subheading?: string;
  excerpt: string;
  body: string;
  categoryId: string;
  categoryName: string;
  tags?: string[];
  coverImage?: string;
  coverCaption?: string;
  authorName: string;
  status: ContentStatus;
  featured: boolean;
  likesCount: number;
  readingTime: number;
  seoTitle?: string;
  seoDescription?: string;
  sourceType: 'editorial' | 'public_submission';
  publishedAt?: any;
  scheduledFor?: any;
  createdAt: any;
  updatedAt: any;
}

export interface WritingWork {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  excerpt?: string;
  body: string;
  coverImage?: string;
  authorName: string;
  authorBio?: string;
  bioApproved?: boolean;
  status: ContentStatus;
  featured: boolean;
  editorsPick: boolean;
  poetrySpotlight: boolean;
  likesCount: number;
  readingTime: number;
  wordCount: number;
  copyrightConfirmed: boolean;
  sourceType: 'editorial' | 'public_submission';
  publishedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface DebateTopic {
  id: string;
  title: string;
  question: string;
  description: string;
  context?: string;
  rules?: string;
  status: DebateStatus;
  openDate: any;
  closeDate: any;
  cycleDays: number;
  approvedArgumentsCount: number;
  forCount: number;
  againstCount: number;
  neutralCount: number;
  featured: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface DebateArgument {
  id: string;
  debateId: string;
  title: string;
  position: ArgumentPosition;
  mainArgument: string;
  supportingReasoning: string;
  references?: string;
  authorName: string;
  status: ArgumentStatus;
  supportCount: number;
  repliesCount: number;
  createdAt: any;
  updatedAt: any;
}

export interface ArgumentReply {
  id: string;
  debateId: string;
  argumentId: string;
  body: string;
  authorName: string;
  status: ReplyStatus;
  createdAt: any;
  updatedAt: any;
}

export interface ContentReport {
  id: string;
  targetType: 'news' | 'writing' | 'argument' | 'reply';
  targetId: string;
  targetTitle: string;
  reason: string;
  details?: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: any;
  updatedAt: any;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'normal' | 'important';
  active: boolean;
  linkUrl?: string;
  linkLabel?: string;
  createdAt: any;
  updatedAt: any;
}

export interface MonthlyRecognition {
  id: string;
  periodLabel: string;
  contributorName: string;
  featuredWorkTitle: string;
  featuredWorkId?: string;
  featuredWorkType?: 'news' | 'writing' | 'argument';
  reason: string;
  points: number;
  isCurrent: boolean;
  approvedBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface MediaAsset {
  id: string;
  title: string;
  url: string;
  caption?: string;
  altText: string;
  category: string;
  createdAt: any;
  createdBy: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  consentGiven: boolean;
  active: boolean;
  unsubscribeToken: string;
  createdAt: any;
}

export interface ModerationRecord {
  id: string;
  targetType: 'news' | 'writing' | 'argument' | 'reply' | 'report';
  targetId: string;
  action: 'approve' | 'reject' | 'request_edits' | 'flag' | 'note' | 'resolve';
  internalNote?: string;
  flaggedSuspicious: boolean;
  moderatorUid: string;
  moderatorEmail: string;
  createdAt: any;
}

export interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  createdAt: any;
}

export interface ScoringWeights {
  writingPublished: number;
  writingLike: number;
  argumentApproved: number;
  argumentSupport: number;
  newsLike: number;
}

export interface PlatformConfig {
  id: string;
  debateCycleDays: number;
  newsletterEnabled: boolean;
  aboutIntro: string;
  mission: string;
  vision: string;
  objectives: string;
  editorialValues: string;
  participationGuidelines: string;
  contactEmail: string;
  contactLocation: string;
  contactHours: string;
  socialLinks?: {
    instagram?: string;
    x?: string;
    youtube?: string;
  };
  scoringWeights: ScoringWeights;
  updatedAt: any;
  updatedBy?: string;
}

export const LIMITS = {
  TITLE_MIN: 4,
  TITLE_MAX: 180,
  EXCERPT_MIN: 10,
  EXCERPT_MAX: 500,
  NEWS_BODY_MIN: 20,
  NEWS_BODY_MAX: 40000,
  WRITING_BODY_MIN: 20,
  WRITING_BODY_MAX: 50000,
  AUTHOR_MAX: 100,
  BIO_MAX: 400,
  ARG_TITLE_MIN: 4,
  ARG_TITLE_MAX: 160,
  ARG_MAIN_MIN: 30,
  ARG_MAIN_MAX: 3000,
  ARG_REASON_MIN: 20,
  ARG_REASON_MAX: 4000,
  REPLY_MIN: 10,
  REPLY_MAX: 1500,
  REF_MAX: 1000,
  URL_MAX: 1000,
} as const;
