import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import LessonPage from '../pages/LessonPage';
import NotFoundPage from '../pages/NotFoundPage';
import PathPage from '../pages/PathPage';
import ProfilePage from '../pages/ProfilePage';
import TunerPage from '../pages/TunerPage';

// Só existe em dev: o import dinâmico sai do bundle de produção (import.meta.env.DEV vira false).
const ChordGalleryPage = import.meta.env.DEV
  ? lazy(() => import('../pages/dev/ChordGalleryPage'))
  : null;

export function App() {
  return (
    <Routes>
      <Route path="licao/:lessonId" element={<LessonPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<PathPage />} />
        <Route path="afinador" element={<TunerPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        {ChordGalleryPage !== null && (
          <Route
            path="dev/acordes"
            element={
              <Suspense fallback={null}>
                <ChordGalleryPage />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
