import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import Dashboard from '@/pages/Dashboard.jsx';
import Landing from '@/pages/Landing.jsx';
import SignInPage from '@/pages/SignInPage.jsx';
import { ApiProvider } from '@/lib/ApiContext.jsx';
import { MeProvider } from '@/lib/MeContext.jsx';
import { useSession } from '@/lib/session.js';

// Workflow pages are code-split: downloaded on first visit only
const ResumePage = lazy(() => import('@/pages/ResumePage.jsx'));
const SkillGapPage = lazy(() => import('@/pages/SkillGapPage.jsx'));
const RoadmapPage = lazy(() => import('@/pages/RoadmapPage.jsx'));
const InterviewPage = lazy(() => import('@/pages/InterviewPage.jsx'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage.jsx'));
const ReportPage = lazy(() => import('@/pages/ReportPage.jsx'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage.jsx'));

export function RequireAuth({ children }) {
  const s = useSession();
  if (!s.isLoaded) return <div className="container py-10"><Skeleton className="h-10 w-1/3" /></div>;
  if (!s.isSignedIn) return <Navigate to="/sign-in" replace />;
  return children;
}

export default function App() {
  return (
    <ApiProvider>
      <MeProvider>
        <Suspense fallback={<div className="container py-10"><Skeleton className="h-10 w-1/3" /></div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignInPage signUp />} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route path="/dashboard" element={<Dashboard />} /><Route path="/resume" element={<ResumePage />} /><Route path="/skill-gap" element={<SkillGapPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} /><Route path="/interview" element={<InterviewPage />} /><Route path="/history" element={<HistoryPage />} />
              <Route path="/reports/:id" element={<ReportPage />} /><Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MeProvider>
    </ApiProvider>
  );
}
