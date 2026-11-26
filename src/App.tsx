import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { WdsProvider } from './contexts/WdsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SiteHeader } from './components/layout/SiteHeader';
import { SiteFooter } from './components/layout/SiteFooter';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { DebatorsPage } from './pages/DebatorsPage';
import { DebateDetailPage } from './pages/DebateDetailPage';
import { WritersPage } from './pages/WritersPage';
import { WritingDetailPage } from './pages/WritingDetailPage';
import { SubmitPage } from './pages/SubmitPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AboutPage } from './pages/AboutPage';
import { SearchPage } from './pages/SearchPage';
import { AdminPage } from './pages/AdminPage';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WdsProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-[#1A1D24] dark:bg-[#0B111E] dark:text-[#F1EFEA] transition-colors">
              <SiteHeader />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/news" element={<NewsPage />} />
                  <Route path="/news/:id" element={<NewsDetailPage />} />
                  <Route path="/debators" element={<DebatorsPage />} />
                  <Route path="/debators/:id" element={<DebateDetailPage />} />
                  <Route path="/writers" element={<WritersPage />} />
                  <Route path="/writers/:id" element={<WritingDetailPage />} />
                  <Route path="/submit" element={<SubmitPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </main>
              <SiteFooter />
            </div>
          </BrowserRouter>
        </WdsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
