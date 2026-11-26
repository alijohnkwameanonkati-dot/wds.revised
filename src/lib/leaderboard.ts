import { toMillis } from './sanitize';
import { DebateArgument, NewsArticle, ScoringWeights, WritingWork } from '../types/wds';

export interface ContributorRank {
  name: string;
  points: number;
  writingsCount: number;
  argumentsCount: number;
  newsCount: number;
  totalLikes: number;
  achievementLabel: string;
}

export function computeLeaderboard(
  writings: WritingWork[],
  debateArgs: DebateArgument[],
  news: NewsArticle[],
  weights: ScoringWeights,
  period: 'weekly' | 'monthly' | 'all',
  pillarFilter: 'overall' | 'writers' | 'debators' | 'news' = 'overall'
): ContributorRank[] {
  const now = Date.now();
  const cutoffMs =
    period === 'weekly'
      ? now - 7 * 24 * 60 * 60 * 1000
      : period === 'monthly'
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0;

  const map = new Map<string, ContributorRank>();

  const getOrInit = (rawName: string): ContributorRank => {
    const clean = rawName.trim() || 'Anonymous Contributor';
    const key = clean.toLowerCase();
    let entry = map.get(key);
    if (!entry) {
      entry = {
        name: clean,
        points: 0,
        writingsCount: 0,
        argumentsCount: 0,
        newsCount: 0,
        totalLikes: 0,
        achievementLabel: 'Contributor',
      };
      map.set(key, entry);
    }
    return entry;
  };

  if (pillarFilter === 'overall' || pillarFilter === 'writers') {
    writings.forEach((w) => {
      const ts = toMillis(w.publishedAt || w.createdAt);
      if (cutoffMs && ts < cutoffMs) return;
      const entry = getOrInit(w.authorName);
      entry.writingsCount += 1;
      entry.totalLikes += w.likesCount || 0;
      entry.points += weights.writingPublished + (w.likesCount || 0) * weights.writingLike;
    });
  }

  if (pillarFilter === 'overall' || pillarFilter === 'debators') {
    debateArgs.forEach((a) => {
      const ts = toMillis(a.createdAt);
      if (cutoffMs && ts < cutoffMs) return;
      const entry = getOrInit(a.authorName);
      entry.argumentsCount += 1;
      entry.totalLikes += a.supportCount || 0;
      entry.points += weights.argumentApproved + (a.supportCount || 0) * weights.argumentSupport;
    });
  }

  if (pillarFilter === 'overall' || pillarFilter === 'news') {
    news.forEach((n) => {
      // Only attribute individual contributors or community reporters when likes exist
      const ts = toMillis(n.publishedAt || n.createdAt);
      if (cutoffMs && ts < cutoffMs) return;
      if (n.sourceType === 'public_submission' || (n.likesCount || 0) > 0) {
        const entry = getOrInit(n.authorName);
        entry.newsCount += 1;
        entry.totalLikes += n.likesCount || 0;
        entry.points += (n.likesCount || 0) * weights.newsLike;
      }
    });
  }

  const list = Array.from(map.values()).filter((item) => item.points > 0);
  list.sort((a, b) => b.points - a.points || b.totalLikes - a.totalLikes);

  return list.map((item) => {
    let label = 'Active Voice';
    if (item.writingsCount > 0 && item.argumentsCount > 0) label = 'All-Round Scholar';
    else if (item.writingsCount >= 2) label = 'Literary Contributor';
    else if (item.argumentsCount >= 2) label = 'Lead Debator';
    else if (item.writingsCount > 0) label = 'Published Writer';
    else if (item.argumentsCount > 0) label = 'Debate Contributor';
    else if (item.newsCount > 0) label = 'Campus Correspondent';
    return { ...item, achievementLabel: label };
  });
}
