import { Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './session';
import { Shell } from './components/Shell';
import { Login } from './pages/Login';
import { Buckets } from './pages/Buckets';
import { Browser } from './pages/Browser';
import { Design } from './pages/Design';
import { ErrorState } from './components/ErrorState';
import { ApiError } from './api';
import { Spinner } from './ui';

function Gate() {
  const { status, refresh } = useSession();
  if (status === 'loading') return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>;
  if (status === 'offline') return <div className="mx-auto max-w-lg p-8"><ErrorState error={new ApiError('network', 0, 'Can’t reach the server. Check your connection and try again.')} onRetry={refresh} /></div>;
  if (status === 'out') return <Login />;
  return <Shell />;
}

export function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/design" element={<Design />} />
        <Route element={<Gate />}>
          <Route index element={<Buckets />} />
          <Route path="b/:bucket/*" element={<Browser />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SessionProvider>
  );
}
