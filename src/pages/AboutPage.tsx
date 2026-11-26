import { useWds } from '../contexts/WdsContext';

export function AboutPage() {
  const { platformConfig } = useWds();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
      <header className="border-b border-[#D8D3C8] dark:border-slate-800 pb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D32] dark:text-[#C9A458] mb-2">
          Our Lady of Grace Senior High School · Ghana
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#0B1528] dark:text-[#F1EFEA] mb-4">
          About the Writers and Debators Society
        </h1>
        <p className="text-base sm:text-lg text-[#4A4F5A] dark:text-slate-300 leading-relaxed max-w-3xl">
          {platformConfig.aboutIntro}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-7 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
            Mission
          </h2>
          <p className="font-serif text-xl text-[#0B1528] dark:text-[#F1EFEA] leading-relaxed">
            {platformConfig.mission}
          </p>
        </div>

        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-7 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
            Vision
          </h2>
          <p className="font-serif text-xl text-[#0B1528] dark:text-[#F1EFEA] leading-relaxed">
            {platformConfig.vision}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-[#D8D3C8] dark:border-slate-800 pt-10">
        <div className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            Core Objectives
          </h2>
          <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {platformConfig.objectives}
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            Editorial Values
          </h2>
          <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {platformConfig.editorialValues}
          </p>
        </div>
      </section>

      <section className="border-t border-[#D8D3C8] dark:border-slate-800 pt-10 space-y-6">
        <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
          Our Three Pillars
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729] p-6">
            <h3 className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
              01. News
            </h3>
            <p className="text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
              Verified campus reporting covering academic achievements, assemblies, club affairs, and school announcements.
            </p>
          </div>
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729] p-6">
            <h3 className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
              02. Debators
            </h3>
            <p className="text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
              Cyclical motion debates welcoming FOR, AGAINST, and NEUTRAL / ANALYSIS perspectives grounded in logic and evidence.
            </p>
          </div>
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729] p-6">
            <h3 className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
              03. Writers
            </h3>
            <p className="text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
              A digital literary journal showcasing original student poetry, short stories, reflective essays, and speeches.
            </p>
          </div>
        </div>
      </section>

      <section id="guidelines" className="border-t border-[#D8D3C8] dark:border-slate-800 pt-10 space-y-3">
        <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
          Participation & Submission Guidelines
        </h2>
        <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 leading-relaxed whitespace-pre-line max-w-3xl">
          {platformConfig.participationGuidelines}
        </p>
      </section>

      <section id="privacy" className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-[#D8D3C8] dark:border-slate-800 pt-10">
        <div className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            Privacy Policy
          </h2>
          <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
            Student visitors browse, vote, and submit entries without creating accounts. We avoid collecting sensitive personal information. Optional newsletter subscriptions require explicit consent and can be deactivated at any time. Unpublished submissions and internal moderation notes remain strictly private to authorized WDS administrators.
          </p>
        </div>

        <div id="terms" className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            Terms of Use
          </h2>
          <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
            Contributors confirm that submitted work is original and does not infringe third-party copyrights. The WDS editorial board reserves the right to edit for clarity, request revisions, or decline submissions that breach Our Lady of Grace Senior High School standards of respectful discourse.
          </p>
        </div>
      </section>

      <section id="contact" className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-8 space-y-4">
        <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
          School Identity & Contact Desk
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm pt-2">
          <div>
            <dt className="text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-1">
              Editorial Email
            </dt>
            <dd className="text-[#1A1D24] dark:text-slate-200 break-words">
              {platformConfig.contactEmail}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-1">
              Campus Location
            </dt>
            <dd className="text-[#1A1D24] dark:text-slate-200">
              {platformConfig.contactLocation}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-1">
              Editorial Hours
            </dt>
            <dd className="text-[#1A1D24] dark:text-slate-200">
              {platformConfig.contactHours}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
