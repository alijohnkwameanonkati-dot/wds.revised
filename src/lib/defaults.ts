import { collection, doc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { Category, MediaAsset, PlatformConfig } from '../types/wds';
import { db } from './firebase';

export const GENERATED_IMAGES = {
  heroQuad: '/src/assets/images/hero_editorial_quad_1795723075387.jpg',
  newsAssembly: '/src/assets/images/news_campus_assembly_1795723075406.jpg',
  debatePodium: '/src/assets/images/debate_podium_stage_1795723076164.jpg',
  writersManuscript: '/src/assets/images/writers_ink_manuscript_1795723076711.jpg',
  spotlightCourtyard: '/src/assets/images/spotlight_student_journal_1795723077513.jpg',
} as const;

export const DEFAULT_NEWS_CATEGORIES: Category[] = [
  { id: 'news-school-news', name: 'School News', slug: 'school-news', pillar: 'news', order: 1, active: true },
  { id: 'news-announcements', name: 'Announcements', slug: 'announcements', pillar: 'news', order: 2, active: true },
  { id: 'news-academics', name: 'Academics', slug: 'academics', pillar: 'news', order: 3, active: true },
  { id: 'news-student-life', name: 'Student Life', slug: 'student-life', pillar: 'news', order: 4, active: true },
  { id: 'news-events', name: 'Events', slug: 'events', pillar: 'news', order: 5, active: true },
  { id: 'news-clubs', name: 'Clubs and Societies', slug: 'clubs-and-societies', pillar: 'news', order: 6, active: true },
  { id: 'news-achievements', name: 'Achievements', slug: 'achievements', pillar: 'news', order: 7, active: true },
  { id: 'news-editorials', name: 'Editorials', slug: 'editorials', pillar: 'news', order: 8, active: true },
  { id: 'news-general', name: 'General News', slug: 'general-news', pillar: 'news', order: 9, active: true },
];

export const DEFAULT_WRITER_CATEGORIES: Category[] = [
  { id: 'writers-poetry', name: 'Poetry', slug: 'poetry', pillar: 'writers', order: 1, active: true },
  { id: 'writers-short-stories', name: 'Short Stories', slug: 'short-stories', pillar: 'writers', order: 2, active: true },
  { id: 'writers-essays', name: 'Essays', slug: 'essays', pillar: 'writers', order: 3, active: true },
  { id: 'writers-reflections', name: 'Reflections', slug: 'reflections', pillar: 'writers', order: 4, active: true },
  { id: 'writers-opinion', name: 'Opinion Pieces', slug: 'opinion-pieces', pillar: 'writers', order: 5, active: true },
  { id: 'writers-nonfiction', name: 'Creative Nonfiction', slug: 'creative-nonfiction', pillar: 'writers', order: 6, active: true },
  { id: 'writers-speeches', name: 'Speeches', slug: 'speeches', pillar: 'writers', order: 7, active: true },
  { id: 'writers-other', name: 'Other Creative Works', slug: 'other-creative-works', pillar: 'writers', order: 8, active: true },
];

export const DEFAULT_MEDIA_ASSETS: Omit<MediaAsset, 'createdAt' | 'createdBy'>[] = [
  {
    id: 'media-hero-quad',
    title: 'WDS Library Reading Circle',
    url: GENERATED_IMAGES.heroQuad,
    caption: 'Students preparing briefs and literary critiques inside the school library.',
    altText: 'Senior high school students gathered around a wooden library table writing notes',
    category: 'Editorial',
  },
  {
    id: 'media-news-assembly',
    title: 'Great Hall Lectern & Assembly',
    url: GENERATED_IMAGES.newsAssembly,
    caption: 'Sunlit assembly hall prepared for school addresses and academic convocations.',
    altText: 'Wooden lectern inside a sunlit stone and timber school assembly hall',
    category: 'News',
  },
  {
    id: 'media-debate-podium',
    title: 'Auditorium Debate Podiums',
    url: GENERATED_IMAGES.debatePodium,
    caption: 'Dual speaking podiums prepared for inter-house and inter-school motions.',
    altText: 'Two classic wooden debate podiums facing an auditorium in warm afternoon light',
    category: 'Debators',
  },
  {
    id: 'media-writers-manuscript',
    title: 'Literary Manuscript & Fountain Pen',
    url: GENERATED_IMAGES.writersManuscript,
    caption: 'Open cream-paper literary notebook and fountain pen on a study desk.',
    altText: 'Open handwritten literary journal with a black and brass fountain pen',
    category: 'Writers',
  },
  {
    id: 'media-spotlight-courtyard',
    title: 'Campus Colonnade Courtyard',
    url: GENERATED_IMAGES.spotlightCourtyard,
    caption: 'Quiet afternoon light along the limestone colonnade and courtyard.',
    altText: 'Students walking and reading along sunlit campus colonnade arches',
    category: 'Campus',
  },
];

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  id: 'main',
  debateCycleDays: 3,
  newsletterEnabled: false,
  aboutIntro:
    'The Writers and Debators Society (WDS) is the official student-led intellectual, journalistic, and literary hub of Our Lady of Grace Senior High School (OLAG), Ghana. Founded to cultivate articulate thinkers, ethical reporters, and imaginative writers, WDS brings campus discourse together in one dignified digital publication.',
  mission:
    'To nurture critical thinking, fearless yet respectful dialogue, verified student journalism, and original literary craft across the Our Lady of Grace Senior High School community.',
  vision:
    'A school culture where every student can inquire deeply, argue with evidence and empathy, document campus life truthfully, and see creative expression celebrated with editorial excellence.',
  objectives:
    '1. Publish accurate, student-led coverage of academics, achievements, and campus life.\n2. Host structured, cyclical intellectual debates grounded in reasoning and mutual respect.\n3. Provide a welcoming literary journal for poetry, essays, short fiction, and speeches.\n4. Recognize thoughtful student contributors fairly through transparent, moderated community engagement.',
  editorialValues:
    'Accuracy before speed. Evidence over volume. Respectful disagreement without personal attacks. Originality and proper attribution in every published work. Privacy protection for student contributors.',
  participationGuidelines:
    'All public submissions—whether debate arguments, replies, news tips, or literary manuscripts—are reviewed by WDS moderators before publication. Contributors may use their real name or an approved pseudonym. Avoid plagiarism, unverified rumors, personal insults, or spam links.',
  contactEmail: '[Editable Placeholder: wds-editorial@olag.edu.gh — update in Admin Governance]',
  contactLocation: '[Editable Placeholder: OLAG Campus Editorial Room, Ghana — update in Admin Governance]',
  contactHours: '[Editable Placeholder: Wednesdays & Fridays, 3:30 PM – 5:00 PM — update in Admin Governance]',
  socialLinks: {
    instagram: '',
    x: '',
    youtube: '',
  },
  scoringWeights: {
    writingPublished: 25,
    writingLike: 2,
    argumentApproved: 20,
    argumentSupport: 3,
    newsLike: 2,
  },
  updatedAt: null,
};

export async function seedInauguralWdsEdition(adminUid: string, adminEmail: string): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  // 1. Platform Config
  batch.set(doc(db, 'platform_config', 'main'), {
    debateCycleDays: DEFAULT_PLATFORM_CONFIG.debateCycleDays,
    newsletterEnabled: true,
    aboutIntro: DEFAULT_PLATFORM_CONFIG.aboutIntro,
    mission: DEFAULT_PLATFORM_CONFIG.mission,
    vision: DEFAULT_PLATFORM_CONFIG.vision,
    objectives: DEFAULT_PLATFORM_CONFIG.objectives,
    editorialValues: DEFAULT_PLATFORM_CONFIG.editorialValues,
    participationGuidelines: DEFAULT_PLATFORM_CONFIG.participationGuidelines,
    contactEmail: DEFAULT_PLATFORM_CONFIG.contactEmail,
    contactLocation: DEFAULT_PLATFORM_CONFIG.contactLocation,
    contactHours: DEFAULT_PLATFORM_CONFIG.contactHours,
    socialLinks: DEFAULT_PLATFORM_CONFIG.socialLinks,
    scoringWeights: DEFAULT_PLATFORM_CONFIG.scoringWeights,
    updatedAt: now,
    updatedBy: adminUid,
  });

  // 2. Categories
  [...DEFAULT_NEWS_CATEGORIES, ...DEFAULT_WRITER_CATEGORIES].forEach((cat) => {
    batch.set(doc(db, 'categories', cat.id), {
      name: cat.name,
      slug: cat.slug,
      pillar: cat.pillar,
      description: `${cat.name} contributions from the OLAG WDS community.`,
      order: cat.order,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 3. Media Library
  DEFAULT_MEDIA_ASSETS.forEach((asset) => {
    batch.set(doc(db, 'media_library', asset.id), {
      title: asset.title,
      url: asset.url,
      caption: asset.caption || '',
      altText: asset.altText,
      category: asset.category,
      createdAt: now,
      createdBy: adminUid,
    });
  });

  // 4. Inaugural Published News Articles (Editorial Launch Pieces)
  batch.set(doc(db, 'news', 'news-inaugural-digital-press'), {
    title: 'OLAG Writers and Debators Society Launches Unified Digital Broadsheet',
    slug: 'olag-wds-launches-unified-digital-broadsheet',
    subheading: 'A new home for verified campus journalism, structured debate cycles, and student literature.',
    excerpt:
      'The Writers and Debators Society opens its digital pressroom to all Our Lady of Grace Senior High School students, uniting campus reporting, formal motion debates, and literary publishing.',
    body: `## A New Chapter for Student Discourse at OLAG

For years, the most memorable speeches, sharp campus essays, and spirited library debates at Our Lady of Grace Senior High School lived briefly in assembly announcements or handwritten notebooks. Today, the Writers and Debators Society (WDS) establishes a permanent, moderated digital archive built for clarity, fairness, and lasting craft.

> "A school grows wiser when its students learn not only to speak fluently, but to listen closely, verify facts, and defend ideas with grace."

### Three Pillars Under One Roof

The platform brings together three distinct editorial rooms:

- **News**: Verified reports on academics, clubs, school achievements, and official student notices.
- **Debators**: Structured three-day debate cycles where students argue FOR, AGAINST, or offer NEUTRAL synthesis without needing to register an account.
- **Writers**: A dedicated literary magazine tailored for verse, short stories, personal reflections, and speeches.

### How Students Participate

Every student can submit original articles, creative writing, or debate arguments directly through the platform's moderated submission desk. All public contributions undergo editorial review to protect accuracy, originality, and mutual respect before appearing online.`,
    categoryId: 'news-editorials',
    categoryName: 'Editorials',
    tags: ['WDS Launch', 'Editorial', 'OLAG Campus'],
    coverImage: GENERATED_IMAGES.heroQuad,
    coverCaption: 'WDS student editors reviewing inaugural manuscripts inside the library reading room.',
    authorName: 'WDS Editorial Board',
    status: 'published',
    featured: true,
    likesCount: 14,
    readingTime: 3,
    seoTitle: 'WDS Launches Unified Digital Broadsheet at OLAG Ghana',
    seoDescription: 'Our Lady of Grace Senior High School Writers and Debators Society opens its student journalism, debate, and creative writing platform.',
    sourceType: 'editorial',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, 'news', 'news-term-symposium-report'), {
    title: 'Term Literary & Oratory Symposium Opens Call for Student Speakers',
    slug: 'term-literary-oratory-symposium-call-for-speakers',
    subheading: 'Forms One through Three invited to submit original speeches and topical briefs ahead of convocation.',
    excerpt:
      'Organizers announce submission guidelines, time allocations, and judging criteria for this term’s flagship public speaking and creative reading afternoon in the Great Hall.',
    body: `## Preparing the Great Hall Stage

The WDS Executive Desk has released the preliminary timetable for this term's Literary & Oratory Symposium, welcoming entries across prepared speeches, dramatic poetry recitations, and impromptu rebuttal rounds.

### Key Expectations for Participants

- **Originality**: Every script must be the student's own composition, with clear citations for historical or statistical claims.
- **Clarity of Structure**: Judges will award marks equally for evidence quality, audience engagement, and disciplined timing.
- **Submission Window**: Draft scripts may be submitted through the WDS Writers desk labeled under Speeches for editorial feedback prior to auditions.`,
    categoryId: 'news-events',
    categoryName: 'Events',
    tags: ['Symposium', 'Oratory', 'Great Hall'],
    coverImage: GENERATED_IMAGES.newsAssembly,
    coverCaption: 'The Great Hall lectern prepared ahead of afternoon academic assemblies.',
    authorName: 'WDS News Desk',
    status: 'published',
    featured: false,
    likesCount: 9,
    readingTime: 2,
    seoTitle: 'Term Literary and Oratory Symposium Call for Speakers',
    seoDescription: 'Guidelines and schedule for OLAG student speakers participating in the term symposium.',
    sourceType: 'editorial',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // 5. Inaugural Active Debate + Upcoming Debate
  const debateOpen = Timestamp.fromMillis(Date.now() - 12 * 60 * 60 * 1000);
  const debateClose = Timestamp.fromMillis(Date.now() + threeDaysMs);
  const upcomingOpen = Timestamp.fromMillis(Date.now() + threeDaysMs + 60 * 60 * 1000);
  const upcomingClose = Timestamp.fromMillis(Date.now() + threeDaysMs * 2);

  batch.set(doc(db, 'debates', 'debate-ai-study-ghana-shs'), {
    title: 'Artificial Intelligence in Senior High School Study',
    question: 'Should Ghanaian senior high schools integrate supervised AI study tools into everyday academic coursework?',
    description:
      'Examine how guided digital tools affect independent problem-solving, examination readiness, academic honesty, and equitable access across Ghanaian campuses.',
    context:
      'Across West Africa and globally, students increasingly encounter automated tutoring and writing assistants. Proponents argue supervised integration builds digital literacy and personalized revision; critics warn of over-reliance, weakened foundational writing, and unequal access between day and boarding environments.',
    rules:
      '1. State a clear position (FOR, AGAINST, or NEUTRAL / ANALYSIS).\n2. Ground claims in logical reasoning or verifiable examples.\n3. Critique ideas rather than individuals.\n4. Keep main arguments concise and cite sources where statistical claims are made.',
    status: 'active',
    openDate: debateOpen,
    closeDate: debateClose,
    cycleDays: 3,
    approvedArgumentsCount: 2,
    forCount: 1,
    againstCount: 1,
    neutralCount: 0,
    featured: true,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, 'debates', 'debate-boarding-reading-culture'), {
    title: 'Evening Prep & Independent Reading Culture',
    question: 'Does dedicating one weekly prep session exclusively to non-examinable reading improve overall academic performance?',
    description:
      'Upcoming motion exploring whether broad literary reading strengthens comprehension across sciences and humanities alike.',
    context:
      'Many students focus exclusively on past examination questions during prep hours. This upcoming motion asks whether protected time for literature, biography, and journalism elevates critical reasoning across all WASSCE subjects.',
    rules:
      'Submissions open once this motion transitions to Active status following the current 3-day debate cycle.',
    status: 'upcoming',
    openDate: upcomingOpen,
    closeDate: upcomingClose,
    cycleDays: 3,
    approvedArgumentsCount: 0,
    forCount: 0,
    againstCount: 0,
    neutralCount: 0,
    featured: false,
    createdAt: now,
    updatedAt: now,
  });

  // 6. Seed 2 Approved Starter Arguments on Active Debate
  batch.set(doc(db, 'arguments', 'arg-ai-supervised-literacy'), {
    debateId: 'debate-ai-study-ghana-shs',
    title: 'Guided AI Literacy Prepares Students for Modern University Research',
    position: 'FOR',
    mainArgument:
      'When teachers establish transparent rules for how digital study assistants may be used—for instance, checking logic gaps or generating practice quizzes rather than ghostwriting essays—students learn discernment instead of blind dependence.',
    supportingReasoning:
      'Banning emerging tools outright rarely stops their informal use outside campus gates; structured instruction teaches students how to verify outputs, spot factual errors, and retain ownership of their own voice.',
    references: 'UNESCO Guidance on Generative AI in Education and Research',
    authorName: 'Abena K. (Form 3 Arts)',
    status: 'approved',
    supportCount: 11,
    repliesCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, 'arguments', 'arg-ai-foundational-craft'), {
    debateId: 'debate-ai-study-ghana-shs',
    title: 'Foundational Writing Must Mature Before Automated Shortcuts',
    position: 'AGAINST',
    mainArgument:
      'Senior high school is the decisive stage where students build mental stamina for outlining arguments, wrestling with difficult paragraphs, and memorizing core scientific principles under timed WASSCE conditions.',
    supportingReasoning:
      'Introducing automated drafting inside daily coursework risks hollowing out the productive struggle that turns hesitant writers into independent thinkers, while widening gaps where hardware access is uneven.',
    references: 'WASSCE Chief Examiners Reports on Essay Structure',
    authorName: 'Kwame M. (Form 2 Science)',
    status: 'approved',
    supportCount: 8,
    repliesCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  // 7. Inaugural Creative Writing Works
  batch.set(doc(db, 'writings', 'writing-red-earth-morning-bell'), {
    title: 'Red Earth After the Morning Bell',
    slug: 'red-earth-after-the-morning-bell',
    categoryId: 'writers-poetry',
    categoryName: 'Poetry',
    excerpt: 'A lyric meditation on rain-washed laterite paths, dawn revision, and quiet ambition along the colonnade.',
    body: `Before the brass bell wakes the courtyard stone,
the rain has washed the red earth clean of haste;
cool mist still clings to palm fronds overgrown,
and chalk-dust dreams have not yet gone to waste.

Along the archways, quiet footsteps keep
the measure of a hundred unwritten lines—
some carrying formulas from midnight sleep,
some folding proverbs into notebook spines.

Let afternoon bring clamour to the hall,
let arguments rise sharp as polished brass;
here in the morning's unhurried calm, we call
the ink to witness everything that lasts.`,
    coverImage: GENERATED_IMAGES.spotlightCourtyard,
    authorName: 'Efua S.',
    authorBio: 'Student poet and member of the OLAG Literary Workshop.',
    bioApproved: true,
    status: 'published',
    featured: true,
    editorsPick: true,
    poetrySpotlight: true,
    likesCount: 16,
    readingTime: 2,
    wordCount: 95,
    copyrightConfirmed: true,
    sourceType: 'editorial',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, 'writings', 'writing-case-for-slow-reading'), {
    title: 'In Defence of Keeping a Commonplace Book',
    slug: 'in-defence-of-keeping-a-commonplace-book',
    categoryId: 'writers-essays',
    categoryName: 'Essays',
    excerpt: 'Why copying striking sentences by hand sharpens memory, vocabulary, and original thought more than passive highlighting.',
    body: `Every serious writer eventually discovers that reading without reflection leaves only faint footprints. Across centuries, scholars kept "commonplace books"—personal notebooks filled not with lecture summaries, but with paragraphs worth arguing with, metaphors worth admiring, and questions left unanswered.

In a fast-moving school term crowded with timetables and syllabi, keeping a small notebook dedicated purely to curiosity feels almost rebellious. Yet copying a single paragraph by hand slows the eye enough to notice rhythm, precision, and restraint.

When you later step onto a debate floor or face a blank examination booklet, those borrowed cadences quietly become your own architecture of thought.`,
    coverImage: GENERATED_IMAGES.writersManuscript,
    authorName: 'Kojo B.',
    authorBio: 'Essayist and contributor to the WDS Writers Desk.',
    bioApproved: true,
    status: 'published',
    featured: false,
    editorsPick: true,
    poetrySpotlight: false,
    likesCount: 12,
    readingTime: 2,
    wordCount: 112,
    copyrightConfirmed: true,
    sourceType: 'editorial',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // 8. School Announcement
  batch.set(doc(db, 'announcements', 'ann-submissions-open'), {
    title: 'WDS Submission Desk Open for Term Entries',
    body: 'Students across all forms may submit original poetry, short stories, essays, news reports, and debate arguments without creating an account. All entries pass through editorial review prior to publication.',
    priority: 'important',
    active: true,
    linkUrl: '',
    linkLabel: '',
    createdAt: now,
    updatedAt: now,
  });

  // 9. Monthly Recognition
  batch.set(doc(db, 'recognitions', 'rec-inaugural-month'), {
    periodLabel: 'Inaugural Edition',
    contributorName: 'Efua S.',
    featuredWorkTitle: 'Red Earth After the Morning Bell',
    featuredWorkId: 'writing-red-earth-morning-bell',
    featuredWorkType: 'writing',
    reason: 'Recognized by the WDS Editorial Board for craftsmanship, vivid Ghanaian campus imagery, and setting a high literary standard for the society’s inaugural journal.',
    points: 57,
    isCurrent: true,
    approvedBy: adminUid,
    createdAt: now,
    updatedAt: now,
  });

  // 10. Audit Log Entry
  batch.set(doc(collection(db, 'audit_logs')), {
    action: 'SEED_INAUGURAL_EDITION',
    targetType: 'platform',
    targetId: 'main',
    summary: 'Initialized WDS platform configuration, categories, media assets, and inaugural editorial content.',
    actorUid: adminUid,
    actorEmail: adminEmail,
    actorRole: 'SUPER_ADMIN',
    createdAt: now,
  });

  await batch.commit();
}
