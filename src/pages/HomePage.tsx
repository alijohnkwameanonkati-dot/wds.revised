import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowRight, BookOpen, CheckCircle2, Feather, MessageSquare, Newspaper, Trophy } from 'lucide-react';
import { useWds } from '../contexts/WdsContext';
import { GENERATED_IMAGES } from '../lib/defaults';
import { computeLeaderboard } from '../lib/leaderboard';
import { formatEditorialDate, makeUniqueId, sanitizePlainText } from '../lib/sanitize';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { EditorialImage } from '../components/common/EditorialImage';

export function HomePage() {
  const {
    publishedNews,
    publishedWritings,
    debates,
    approvedArguments,
    announcements,
    recognitions,
    platformConfig,
  } = useWds();

  const [subEmail, setSubEmail] = useState('');
  const [subConsent, setSubConsent] = useState(false);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subMessage, setSubMessage] = useState<string | null>(null);

  const activeAnnouncements = useMemo(
    () => announcements.filter((a) => a.active).slice(0, 3),
    [announcements]
  );

  const leadStory = useMemo(
    () => publishedNews.find((n) => n.featured) || publishedNews[0] || null,
    [publishedNews]
  );

  const supportingStories = useMemo(() => {
    const others = publishedNews.filter((n) => n.id !== leadStory?.id).slice(0, 2);
    const featuredWriting = publishedWritings.find((w) => w.featured) || publishedWritings[0];
    return { news: others, writing: featuredWriting };
  }, [publishedNews, publishedWritings, leadStory]);

  const activeDebate = useMemo(
    () => debates.find((d) => d.status === 'active') || debates[0] || null,
    [debates]
  );

  const recentWritings = useMemo(() => publishedWritings.slice(0, 4), [publishedWritings]);

  const featuredWriters = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ name: string; title: string; id: string; category: string }> = [];
    publishedWritings.forEach((w) => {
      const key = w.authorName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ name: w.authorName, title: w.title, id: w.id, category: w.categoryName });
      }
    });
    return list.slice(0, 4);
  }, [publishedWritings]);

  const weeklyLeaderboard = useMemo(
    () =>
      computeLeaderboard(
        publishedWritings,
        approvedArguments,
        publishedNews,
        platformConfig.scoringWeights,
        'weekly',
        'overall'
      ).slice(0, 5),
    [publishedWritings, approvedArguments, publishedNews, platformConfig.scoringWeights]
  );

  const currentRecognition = useMemo(
    () => recognitions.find((r) => r.isCurrent) || recognitions[0] || null,
    [recognitions]
  );

  const realStats = useMemo(() => {
    const contributors = new Set<string>();
    publishedWritings.forEach((w) => contributors.add(w.authorName.toLowerCase()));
    approvedArguments.forEach((a) => contributors.add(a.authorName.toLowerCase()));
    const totalCount =
      publishedNews.length + publishedWritings.length + debates.length + approvedArguments.length;
    if (totalCount === 0) return null;
    return [
      { label: 'Published News', value: publishedNews.length },
      { label: 'Debate Motions', value: debates.length },
      { label: 'Approved Arguments', value: approvedArguments.length },
      { label: 'Literary Works', value: publishedWritings.length },
      { label: 'Active Contributors', value: contributors.size },
    ];
  }, [publishedNews, publishedWritings, debates, approvedArguments]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubMessage(null);
    const cleanEmail = sanitizePlainText(subEmail).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setSubMessage('Please enter a valid email address.');
      return;
    }
    if (!subConsent) {
      setSubMessage('Please confirm consent to receive WDS publication updates.');
      return;
    }
    setSubmittingSub(true);
    const id = makeUniqueId('sub');
    const token = makeUniqueId('unsub');
    try {
      await setDoc(doc(db, 'newsletter_subscribers', id), {
        email: cleanEmail,
        consentGiven: true,
        active: true,
        unsubscribeToken: token,
        createdAt: serverTimestamp(),
      });
      setSubEmail('');
      setSubConsent(false);
      setSubMessage('Subscribed. You will receive curated WDS edition updates.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `newsletter_subscribers/${id}`);
    } finally {
      setSubmittingSub(false);
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Important School Announcements Strip */}
      {activeAnnouncements.length > 0 && (
        <section aria-label="School Announcements" className="border-b border-[#E5E0D5] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-[#1A1D24] dark:text-slate-200 flex items-baseline gap-2.5">
              <span className="font-semibold uppercase tracking-widest text-[11px] text-[#8C6D32] dark:text-[#C9A458] shrink-0">
                Notice
              </span>
              <span className="font-medium">{activeAnnouncements[0].title}</span>
              <span className="hidden md:inline text-[#5C626F] dark:text-slate-400">
                — {activeAnnouncements[0].body}
              </span>
            </div>
            <Link
              to="/submit"
              className="text-xs font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline whitespace-nowrap shrink-0"
            >
              Submit an entry →
            </Link>
          </div>
        </section>
      )}

      {/* Editorial Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch border-b border-[#D8D3C8] dark:border-slate-800 pb-12">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D32] dark:text-[#C9A458] font-medium mb-4">
                Our Lady of Grace Senior High School · Ghana
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.45rem] font-bold tracking-tight text-[#0B1528] dark:text-[#F1EFEA] leading-[1.08] mb-5">
                Where Ideas Find Their Voice.
              </h1>
              <p className="text-base sm:text-lg text-[#4A4F5A] dark:text-slate-300 leading-relaxed max-w-xl mb-8">
                Discover stories, challenge perspectives and celebrate creativity at Our Lady of Grace Senior High School.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#pillars"
                className="px-6 py-3 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
              >
                Explore WDS
              </a>
              <Link
                to="/submit"
                className="px-6 py-3 text-sm font-medium border border-[#0B1528] dark:border-slate-600 text-[#0B1528] dark:text-[#F1EFEA] hover:bg-[#0B1528]/5 dark:hover:bg-white/5 transition-colors whitespace-nowrap shrink-0"
              >
                Submit Your Work
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[280px] sm:min-h-[360px] overflow-hidden border border-[#D8D3C8] dark:border-slate-800">
              <img
                src={GENERATED_IMAGES.heroQuad}
                alt="OLAG Writers and Debators Society students gathered around a reading table"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5 sm:p-6">
                <p className="text-xs uppercase tracking-widest text-[#E5C67E] mb-1">
                  WDS Student Publication
                </p>
                <p className="font-serif text-base sm:text-lg text-white leading-snug max-w-md">
                  Journalism, structured debate, and literary craft from the OLAG campus community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Content Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between border-b border-[#D8D3C8] dark:border-slate-800 pb-3 mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            Featured Dispatch
          </h2>
          <Link to="/news" className="text-xs font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline whitespace-nowrap shrink-0">
            All News →
          </Link>
        </div>

        {leadStory ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Lead Featured Story */}
            <article className="lg:col-span-7 group">
              <Link to={`/news/${leadStory.id}`} className="block">
                <EditorialImage
                  src={leadStory.coverImage}
                  alt={leadStory.title}
                  title={leadStory.title}
                  aspectClass="aspect-[16/10]"
                  className="mb-5 border border-[#E5E0D5] dark:border-slate-800"
                />
                <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-2">
                  <span className="font-semibold text-[#8C6D32] dark:text-[#C9A458]">{leadStory.categoryName}</span>
                  <span className="mx-2">·</span>
                  <span>{formatEditorialDate(leadStory.publishedAt || leadStory.createdAt)}</span>
                  <span className="mx-2">·</span>
                  <span>{leadStory.readingTime} min read</span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline decoration-[#B68D40] underline-offset-4 mb-3">
                  {leadStory.title}
                </h3>
                <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 leading-relaxed mb-3">
                  {leadStory.excerpt}
                </p>
                <p className="text-xs font-medium text-[#1A1D24] dark:text-slate-200">
                  By {leadStory.authorName}
                </p>
              </Link>
            </article>

            {/* Supporting Stories */}
            <div className="lg:col-span-5 divide-y divide-[#E5E0D5] dark:divide-slate-800 border-t lg:border-t-0 lg:border-l border-[#E5E0D5] dark:border-slate-800 lg:pl-8">
              {supportingStories.news.map((item) => (
                <article key={item.id} className="py-5 first:pt-0">
                  <Link to={`/news/${item.id}`} className="group grid grid-cols-3 gap-4 items-start">
                    <div className="col-span-2">
                      <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-1">
                        <span className="font-medium text-[#8C6D32] dark:text-[#C9A458]">{item.categoryName}</span>
                        <span className="mx-1.5">·</span>
                        <span>{item.readingTime} min read</span>
                      </div>
                      <h4 className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-1.5">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#4A4F5A] dark:text-slate-400 line-clamp-2">
                        {item.excerpt}
                      </p>
                    </div>
                    <EditorialImage
                      src={item.coverImage}
                      alt={item.title}
                      title={item.title}
                      aspectClass="aspect-[4/3]"
                      className="border border-[#E5E0D5] dark:border-slate-800"
                    />
                  </Link>
                </article>
              ))}

              {supportingStories.writing && (
                <article className="py-5">
                  <Link to={`/writers/${supportingStories.writing.id}`} className="group grid grid-cols-3 gap-4 items-start">
                    <div className="col-span-2">
                      <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-1">
                        <span className="font-medium text-[#8C6D32] dark:text-[#C9A458]">
                          Writers · {supportingStories.writing.categoryName}
                        </span>
                        <span className="mx-1.5">·</span>
                        <span>{supportingStories.writing.readingTime} min read</span>
                      </div>
                      <h4 className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-1.5">
                        {supportingStories.writing.title}
                      </h4>
                      <p className="text-xs text-[#4A4F5A] dark:text-slate-400">
                        By {supportingStories.writing.authorName}
                      </p>
                    </div>
                    <EditorialImage
                      src={supportingStories.writing.coverImage}
                      alt={supportingStories.writing.title}
                      title={supportingStories.writing.title}
                      aspectClass="aspect-[4/3]"
                      className="border border-[#E5E0D5] dark:border-slate-800"
                    />
                  </Link>
                </article>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-2">
                Inaugural Pressroom Ready
              </p>
              <h3 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
                No published dispatches yet.
              </h3>
              <p className="text-sm text-[#4A4F5A] dark:text-slate-300 max-w-xl">
                Students can submit stories, poems, or campus tips directly to the moderation desk, or an administrator can sign in to publish the inaugural edition.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/submit"
                className="px-5 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E]"
              >
                Submit Content
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Three Pillars Introduction */}
      <section id="pillars" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-3 mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            The Three Pillars of WDS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1: News */}
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] flex flex-col justify-between">
            <div>
              <EditorialImage
                src={GENERATED_IMAGES.newsAssembly}
                alt="OLAG Assembly Hall"
                aspectClass="aspect-[4/3]"
              />
              <div className="p-6">
                <div className="flex items-center justify-between text-xs text-[#8C6D32] dark:text-[#C9A458] mb-2">
                  <span className="font-semibold tracking-widest uppercase">01. News</span>
                  <Newspaper className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
                  Student Journalism
                </h3>
                <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed mb-4">
                  Latest school updates, academic reports, club events, achievements, and verified campus announcements.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#ECE8DF] dark:border-slate-800">
              <Link to="/news" className="inline-flex items-center gap-2 text-sm font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline">
                Enter Newsroom <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Pillar 2: Debators */}
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-[#0B1528] text-white flex flex-col justify-between">
            <div>
              <EditorialImage
                src={GENERATED_IMAGES.debatePodium}
                alt="Debate Auditorium Podiums"
                aspectClass="aspect-[4/3]"
              />
              <div className="p-6">
                <div className="flex items-center justify-between text-xs text-[#E5C67E] mb-2">
                  <span className="font-semibold tracking-widest uppercase">02. Debators</span>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-white mb-2">
                  Intellectual Arena
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  Structured motions, principled arguments FOR, AGAINST, and NEUTRAL, and moderated peer rebuttals.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/15">
              <Link to="/debators" className="inline-flex items-center gap-2 text-sm font-medium text-[#E5C67E] hover:underline">
                Join the Debate <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Writers */}
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] flex flex-col justify-between">
            <div>
              <EditorialImage
                src={GENERATED_IMAGES.writersManuscript}
                alt="Literary journal and fountain pen"
                aspectClass="aspect-[4/3]"
              />
              <div className="p-6">
                <div className="flex items-center justify-between text-xs text-[#8C6D32] dark:text-[#C9A458] mb-2">
                  <span className="font-semibold tracking-widest uppercase">03. Writers</span>
                  <Feather className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
                  Literary Journal
                </h3>
                <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed mb-4">
                  Poetry, short stories, essays, reflections, and original student speeches formatted for unhurried reading.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#ECE8DF] dark:border-slate-800">
              <Link to="/writers" className="inline-flex items-center gap-2 text-sm font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline">
                Read Literary Works <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Current Debate Spotlight + Weekly Leaderboard Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Active Debate */}
          <div className="lg:col-span-7 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 border-b border-[#ECE8DF] dark:border-slate-800 pb-3 mb-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
                  Current Debate Motion
                </span>
                {activeDebate && (
                  <span className="font-mono-tabular text-xs text-[#5C626F] dark:text-slate-400">
                    {activeDebate.status.toUpperCase()} · {activeDebate.approvedArgumentsCount} approved arguments
                  </span>
                )}
              </div>

              {activeDebate ? (
                <>
                  <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-3">
                    {activeDebate.question}
                  </h3>
                  <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed mb-6">
                    {activeDebate.description}
                  </p>
                  <div className="grid grid-cols-3 gap-4 border-y border-[#ECE8DF] dark:border-slate-800 py-4 mb-6 font-mono-tabular text-xs">
                    <div>
                      <span className="text-[#5C626F] dark:text-slate-400 block">FOR</span>
                      <span className="text-lg font-semibold text-[#14532D] dark:text-emerald-400">
                        {activeDebate.forCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5C626F] dark:text-slate-400 block">AGAINST</span>
                      <span className="text-lg font-semibold text-[#9A3412] dark:text-rose-400">
                        {activeDebate.againstCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5C626F] dark:text-slate-400 block">NEUTRAL</span>
                      <span className="text-lg font-semibold text-[#1E3A8A] dark:text-sky-400">
                        {activeDebate.neutralCount}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#4A4F5A] dark:text-slate-300 py-6">
                  No active motion is currently open. Upcoming motions are scheduled by the WDS editorial board.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              {activeDebate ? (
                <>
                  <span className="text-xs text-[#5C626F] dark:text-slate-400">
                    Closes {formatEditorialDate(activeDebate.closeDate)}
                  </span>
                  <Link
                    to={`/debators/${activeDebate.id}`}
                    className="px-5 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90"
                  >
                    Read & Submit Argument
                  </Link>
                </>
              ) : (
                <Link to="/debators" className="text-sm font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline">
                  Visit Debators Archive →
                </Link>
              )}
            </div>
          </div>

          {/* Weekly Leaderboard & Monthly Recognition */}
          <div className="lg:col-span-5 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#ECE8DF] dark:border-slate-800 pb-3 mb-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
                  Community Recognition
                </span>
                <Trophy className="w-4 h-4 text-[#B68D40]" />
              </div>

              {currentRecognition && (
                <div className="mb-6 pb-5 border-b border-[#ECE8DF] dark:border-slate-800">
                  <p className="text-xs text-[#5C626F] dark:text-slate-400 mb-1">
                    Contributor of the Month · {currentRecognition.periodLabel}
                  </p>
                  <p className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
                    {currentRecognition.contributorName}
                  </p>
                  <p className="text-xs text-[#4A4F5A] dark:text-slate-300 mt-1">
                    Featured: {currentRecognition.featuredWorkTitle}
                  </p>
                </div>
              )}

              {weeklyLeaderboard.length > 0 ? (
                <div className="divide-y divide-[#ECE8DF] dark:divide-slate-800">
                  {weeklyLeaderboard.map((row, idx) => (
                    <div key={row.name} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-3 min-w-0">
                        <span className="font-mono-tabular text-xs font-semibold text-[#8C6D32] dark:text-[#C9A458] w-5">
                          0{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1A1D24] dark:text-[#F1EFEA] truncate">
                            {row.name}
                          </p>
                          <p className="text-xs text-[#5C626F] dark:text-slate-400">
                            {row.achievementLabel}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono-tabular text-xs font-semibold text-[#0B1528] dark:text-slate-200 shrink-0">
                        {row.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#4A4F5A] dark:text-slate-300 py-4">
                  Rankings appear automatically once approved writings and debate arguments accumulate community engagement.
                </p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-[#ECE8DF] dark:border-slate-800">
              <Link to="/leaderboard" className="text-sm font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline">
                View full leaderboard & scoring →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Published Writing & Featured Writers */}
      {recentWritings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between border-b border-[#D8D3C8] dark:border-slate-800 pb-3 mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
              Recently Published Writing
            </h2>
            <Link to="/writers" className="text-xs font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline">
              Explore Writers →
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
              {recentWritings.map((work) => (
                <article key={work.id} className="group border-b border-[#ECE8DF] dark:border-slate-800 pb-6">
                  <Link to={`/writers/${work.id}`} className="block">
                    <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-2">
                      <span className="font-medium text-[#8C6D32] dark:text-[#C9A458]">{work.categoryName}</span>
                      <span className="mx-2">·</span>
                      <span>{work.wordCount} words</span>
                      <span className="mx-2">·</span>
                      <span>{work.readingTime} min read</span>
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-2">
                      {work.title}
                    </h3>
                    {work.excerpt && (
                      <p className="text-sm text-[#4A4F5A] dark:text-slate-300 line-clamp-2 mb-3">
                        {work.excerpt}
                      </p>
                    )}
                    <p className="text-xs font-medium text-[#1A1D24] dark:text-slate-200">
                      By {work.authorName}
                    </p>
                  </Link>
                </article>
              ))}
            </div>

            <aside className="lg:col-span-4 border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729] p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D8D3C8] dark:border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
                  Featured Writers
                </h3>
                <BookOpen className="w-4 h-4 text-[#8C6D32] dark:text-[#C9A458]" />
              </div>
              <div className="divide-y divide-[#D8D3C8] dark:divide-slate-800">
                {featuredWriters.map((fw) => (
                  <Link key={fw.id} to={`/writers/${fw.id}`} className="block py-3 group">
                    <p className="font-medium text-sm text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline">
                      {fw.name}
                    </p>
                    <p className="text-xs text-[#5C626F] dark:text-slate-400 truncate">
                      {fw.category} · {fw.title}
                    </p>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* Real Database Statistics (Shown strictly when real data exists) */}
      {realStats && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-y border-[#D8D3C8] dark:border-slate-800 py-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {realStats.map((stat) => (
              <div key={stat.label}>
                <div className="font-mono-tabular text-3xl font-semibold text-[#0B1528] dark:text-[#C9A458]">
                  {stat.value}
                </div>
                <div className="text-xs uppercase tracking-wider text-[#5C626F] dark:text-slate-400 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* About WDS Introduction & Optional Newsletter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className={platformConfig.newsletterEnabled ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <p className="text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-2">
              About Our Society
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-4">
              Cultivating Thinkers, Reporters & Poets at OLAG
            </h2>
            <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 leading-relaxed max-w-3xl mb-5">
              {platformConfig.aboutIntro}
            </p>
            <Link to="/about" className="text-sm font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline">
              Read Mission, Vision & Guidelines →
            </Link>
          </div>

          {platformConfig.newsletterEnabled && (
            <div className="lg:col-span-5 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6">
              <h3 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
                Edition Dispatch
              </h3>
              <p className="text-xs text-[#5C626F] dark:text-slate-400 mb-4 leading-relaxed">
                Receive curated notices when new debates open or special literary editions are published. No student account required.
              </p>
              <form onSubmit={handleSubscribe} className="space-y-3">
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
                />
                <label className="flex items-start gap-2.5 text-xs text-[#4A4F5A] dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subConsent}
                    onChange={(e) => setSubConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>I consent to receive WDS publication updates and understand I may unsubscribe at any time.</span>
                </label>
                <button
                  type="submit"
                  disabled={submittingSub}
                  className="w-full py-2.5 px-4 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {submittingSub ? 'Subscribing...' : 'Subscribe to Updates'}
                </button>
                {subMessage && (
                  <p className="text-xs flex items-center gap-1.5 text-[#14532D] dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {subMessage}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
