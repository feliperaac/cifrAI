import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import NotFoundPage from '../pages/NotFoundPage';
import PathPage from '../pages/PathPage';
import ProfilePage from '../pages/ProfilePage';
import TunerPage from '../pages/TunerPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PathPage />} />
        <Route path="afinador" element={<TunerPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
