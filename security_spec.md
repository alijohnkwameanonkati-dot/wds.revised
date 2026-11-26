# WDS Security Specification & Threat Model

## 1. Data Invariants
1. **Private Submission Isolation**: Pending, rejected, draft, scheduled, and archived `news`, `writings`, `arguments`, and `replies` must NEVER be readable by unauthenticated visitors. Public reads/lists are strictly gated on `status == 'published'` (or `'approved'` for debate arguments/replies).
2. **No Self-Privilege Escalation**: Visitors cannot create or modify `admins/{uid}` unless they are the bootstrapped Super Admin (`v1o2r0t6e1x0@gmail.com` with `email_verified == true`), an existing `SUPER_ADMIN`, or hold an active `adminInvites` record matching their verified email and exact invited role.
3. **Internal Moderation & PII Isolation**: `moderation_records`, `reports`, `audit_logs`, and `newsletter_subscribers` are completely unreadable to the public. Internal moderation notes are stored in `moderation_records`, never in public content documents.
4. **Submission State Integrity**: Public `create` operations on `news`, `writings`, `arguments`, and `replies` are strictly forced to `status == 'pending'`, zero engagement counts (`likesCount == 0`, `supportCount == 0`, `repliesCount == 0`), and `featured == false`.
5. **Active Debate Enforcement**: Public argument submissions require `exists()` and `status == 'active'` on the referenced parent debate document.
6. **Temporal & Immutable Field Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on update.
7. **Volumetric Bounds & URL Safety**: All strings enforce `.size()` limits matching `firebase-blueprint.json`; all `coverImage` and `linkUrl` values restrict schemes to `https://`, `http://`, or local `/src/assets/images/` assets.
8. **Immutable Audit Trail**: `audit_logs` cannot be updated or deleted by anyone.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Published Bypass on Writing Submit**: Public POST to `/writings/{id}` with `status: "published"`, `featured: true` -> **DENIED**.
2. **Ghost Field Shadow Update**: Public POST to `/arguments/{id}` with extra field `isVerified: true` -> **DENIED** (`hasOnly` rejection).
3. **Self-Admin Escalation**: Authenticated non-admin creates `/admins/{uid}` with `role: "SUPER_ADMIN"` without invite -> **DENIED**.
4. **Unverified Email Spoofing**: Sign-in with `email_verified: false` attempting admin write -> **DENIED**.
5. **PII / Subscriber Scraping**: Unauthenticated `list` on `/newsletter_subscribers` or `/reports` -> **DENIED**.
6. **Draft / Pending Content Scrape**: Unauthenticated `list` on `/writings` without `where("status", "==", "published")` -> **DENIED**.
7. **Argument Injection into Closed Debate**: Public POST to `/arguments/{id}` referencing a `closed` debate -> **DENIED**.
8. **Vote Counter Inflation**: Public PATCH to `/news/{id}` setting `likesCount: 9999` -> **DENIED** (`likesCount == existing().likesCount + 1` check).
9. **Duplicate Vote Replay**: Public `setDoc` on existing `/votes/{voteId}` -> **DENIED** (`allow update: if false`).
10. **ID Poisoning**: Document creation with 500-char ID or invalid characters `../admin` -> **DENIED** (`isValidId` check).
11. **Moderation Note Injection**: Public POST to `/moderation_records/{id}` -> **DENIED**.
12. **Audit Log Tampering**: Moderator/Admin attempting `delete` or `update` on `/audit_logs/{id}` -> **DENIED**.
