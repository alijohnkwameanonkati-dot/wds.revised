/**
 * Security Rule Verification Scenarios (Dirty Dozen Test Matrix)
 * Matches security_spec.md invariants against firestore.rules.
 */
export interface RuleTestCase {
  id: string;
  description: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid?: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOW';
}

export const dirtyDozenCases: RuleTestCase[] = [
  {
    id: 'DD-01',
    description: 'Public user attempts to publish writing directly',
    operation: 'create',
    path: '/writings/test-writing-1',
    auth: null,
    payload: { status: 'published', featured: true, copyrightConfirmed: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    description: 'Public user injects ghost field isVerified into argument',
    operation: 'create',
    path: '/arguments/test-arg-1',
    auth: null,
    payload: { status: 'pending', isVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    description: 'Authenticated non-admin attempts self-admin escalation',
    operation: 'create',
    path: '/admins/attacker-uid',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker-uid', role: 'SUPER_ADMIN', active: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    description: 'Unverified email spoof attempt for bootstrap admin',
    operation: 'create',
    path: '/news/spoof-news-1',
    auth: { uid: 'spoof-uid', email: 'v1o2r0t6e1x0@gmail.com', email_verified: false },
    payload: { status: 'published' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    description: 'Unauthenticated list on newsletter_subscribers PII',
    operation: 'list',
    path: '/newsletter_subscribers',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    description: 'Unauthenticated blanket list on writings without published filter',
    operation: 'list',
    path: '/writings',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    description: 'Public argument submission to closed debate',
    operation: 'create',
    path: '/arguments/closed-arg-1',
    auth: null,
    payload: { debateId: 'closed-debate', status: 'pending' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    description: 'Public user inflates likesCount by +50',
    operation: 'update',
    path: '/news/pub-news-1',
    auth: null,
    payload: { likesCount: 50 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    description: 'Duplicate vote overwrite on existing vote document',
    operation: 'update',
    path: '/votes/news_pub-news-1_client12345',
    auth: null,
    payload: { targetId: 'pub-news-1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    description: 'ID poisoning with invalid characters',
    operation: 'create',
    path: '/reports/../../admins/x',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    description: 'Public user attempts to write internal moderation note',
    operation: 'create',
    path: '/moderation_records/mod-1',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    description: 'Admin attempts to delete immutable audit log',
    operation: 'delete',
    path: '/audit_logs/log-1',
    auth: { uid: 'admin-uid', email: 'v1o2r0t6e1x0@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
