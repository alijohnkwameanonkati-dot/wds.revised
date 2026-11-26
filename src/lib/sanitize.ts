export function sanitizePlainText(input: string): string {
  return input
    .replace(/<[^>]*>?/gm, '')
    .replace(/\u0000/g, '')
    .trim();
}

export function sanitizeMultilineText(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function isSafeUrl(url: string): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed.startsWith('/src/assets/images/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function makeSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return cleaned || 'entry';
}

export function makeUniqueId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}-${ts}-${random}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function estimateReadingTime(text: string): number {
  const words = countWords(text);
  return Math.max(1, Math.min(120, Math.ceil(words / 200)));
}

export function getOrCreateClientToken(): string {
  const key = 'wds_visitor_token_v1';
  try {
    const existing = localStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{12,64}$/.test(existing)) {
      return existing;
    }
    const fresh = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function simpleHash(text: string): string {
  let hash = 0;
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

const RATE_LIMIT_KEY = 'wds_submit_history_v1';

export function checkSubmissionGuard(
  kind: string,
  contentSignature: string,
  cooldownMs = 20000
): { ok: true } | { ok: false; reason: string } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const parsed: { lastAt?: Record<string, number>; hashes?: string[] } = raw ? JSON.parse(raw) : {};
    const lastTime = parsed.lastAt?.[kind] ?? 0;
    const elapsed = Date.now() - lastTime;
    if (elapsed < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
      return {
        ok: false,
        reason: `Please wait ${waitSec}s before submitting another ${kind} entry to help prevent spam.`,
      };
    }
    const sigHash = simpleHash(`${kind}:${contentSignature}`);
    if (parsed.hashes?.includes(sigHash)) {
      return {
        ok: false,
        reason: 'This submission matches content you recently sent and is already queued for moderation.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export function recordSubmissionGuard(kind: string, contentSignature: string): void {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const parsed: { lastAt?: Record<string, number>; hashes?: string[] } = raw ? JSON.parse(raw) : {};
    const lastAt = { ...(parsed.lastAt || {}), [kind]: Date.now() };
    const sigHash = simpleHash(`${kind}:${contentSignature}`);
    const hashes = [sigHash, ...(parsed.hashes || []).slice(0, 14)];
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ lastAt, hashes }));
  } catch {
    // Ignore storage errors in private browsing
  }
}

export function containsSuspiciousSpam(text: string): string | null {
  const urlMatches = text.match(/https?:\/\//gi) || [];
  if (urlMatches.length > 5) {
    return 'Too many external links detected. Please limit references to 5 or fewer URLs.';
  }
  if (/([a-zA-Z0-9])\1{18,}/.test(text)) {
    return 'Repeated character spam detected. Please revise your submission.';
  }
  return null;
}

export function formatEditorialDate(ts: any): string {
  if (!ts) return 'Unscheduled';
  let date: Date;
  if (typeof ts?.toDate === 'function') {
    date = ts.toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else if (typeof ts === 'string' || typeof ts === 'number') {
    date = new Date(ts);
  } else if (typeof ts?.seconds === 'number') {
    date = new Date(ts.seconds * 1000);
  } else {
    return 'Unscheduled';
  }
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  return date.toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime() || 0;
  return 0;
}
