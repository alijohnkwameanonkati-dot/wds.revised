import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { useWds } from '../../contexts/WdsContext';

export function SiteFooter() {
  const { platformConfig } = useWds();
  const socials = platformConfig.socialLinks || {};

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#080D18] text-[#1A1D24] dark:text-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#D8D3C8] dark:border-slate-800">
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="font-serif text-2xl font-bold text-[#0B1528] dark:text-[#F1EFEA] inline-block">
              WDS — Writers and Debators Society
            </Link>
            <p className="text-sm text-[#4A4F5A] dark:text-slate-400 leading-relaxed max-w-md">
              The student journalism, intellectual debate, and literary publishing platform of Our Lady of Grace Senior High School (OLAG), Ghana.
            </p>
            <div className="text-xs text-[#5C626F] dark:text-slate-400 space-y-1">
              <p>{platformConfig.contactLocation}</p>
              <p>{platformConfig.contactEmail}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              Pillars
            </h3>
            <ul className="space-y-2 text-sm text-[#4A4F5A] dark:text-slate-300">
              <li><Link to="/news" className="hover:text-[#0B1528] dark:hover:text-white">News Centre</Link></li>
              <li><Link to="/debators" className="hover:text-[#0B1528] dark:hover:text-white">Debators Arena</Link></li>
              <li><Link to="/writers" className="hover:text-[#0B1528] dark:hover:text-white">Writers Journal</Link></li>
              <li><Link to="/leaderboard" className="hover:text-[#0B1528] dark:hover:text-white">Leaderboard</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              Participation
            </h3>
            <ul className="space-y-2 text-sm text-[#4A4F5A] dark:text-slate-300">
              <li><Link to="/submit" className="hover:text-[#0B1528] dark:hover:text-white">Submit Your Work</Link></li>
              <li><Link to="/about#guidelines" className="hover:text-[#0B1528] dark:hover:text-white">Submission Guidelines</Link></li>
              <li><Link to="/search" className="hover:text-[#0B1528] dark:hover:text-white">Search Archive</Link></li>
              <li><Link to="/about" className="hover:text-[#0B1528] dark:hover:text-white">About WDS</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              Governance
            </h3>
            <ul className="space-y-2 text-sm text-[#4A4F5A] dark:text-slate-300">
              <li><Link to="/about#privacy" className="hover:text-[#0B1528] dark:hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/about#terms" className="hover:text-[#0B1528] dark:hover:text-white">Terms of Use</Link></li>
              <li><Link to="/about#contact" className="hover:text-[#0B1528] dark:hover:text-white">Contact Information</Link></li>
              {(socials.instagram || socials.x || socials.youtube) && (
                <li className="pt-2 flex items-center gap-3 text-xs">
                  {socials.instagram && (
                    <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="underline">
                      Instagram
                    </a>
                  )}
                  {socials.x && (
                    <a href={socials.x} target="_blank" rel="noopener noreferrer" className="underline">
                      X
                    </a>
                  )}
                  {socials.youtube && (
                    <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="underline">
                      YouTube
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C626F] dark:text-slate-400">
          <p>
            © {new Date().getFullYear()} Writers and Debators Society — Our Lady of Grace Senior High School (OLAG), Ghana.
          </p>
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D8D3C8] dark:border-slate-700 hover:border-[#0B1528] dark:hover:border-[#C9A458] text-[#1A1D24] dark:text-slate-200 transition-colors cursor-pointer"
          >
            Back to top
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
