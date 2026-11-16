import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { LessonPlayer } from '../lesson/LessonPlayer';
import { useLesson, type LessonLoader } from '../lesson/useLesson';
import { t } from '../i18n';

export default function LessonPage({ loader }: { loader?: LessonLoader }) {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const load = useLesson(lessonId, loader, attempt);
  const back = () => void navigate('/');

  if (load.status === 'ready') {
    if (load.lesson.exercises.length === 0) {
      return (
        <div className="mx-auto max-w-md p-4">
          <Card status="empty" emptyMessage={t('lesson.noExercises')} />
        </div>
      );
    }
    return <LessonPlayer key={load.lesson.id} lesson={load.lesson} onExit={back} />;
  }
  return (
    <main className="mx-auto max-w-md p-4">
      <Card
        status={load.status === 'empty' ? 'empty' : load.status}
        emptyMessage={t('lesson.load.notFound')}
        errorMessage={t('lesson.load.error')}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    </main>
  );
}
