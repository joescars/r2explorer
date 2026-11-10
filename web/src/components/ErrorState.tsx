import { CloudOff, Lock, SearchX, TriangleAlert } from 'lucide-react';
import { friendlyError } from '../api';
import { Button, EmptyState } from '../ui';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, message, kind } = friendlyError(error);
  const icon = kind === 'network' ? CloudOff : kind === 'forbidden' || kind === 'unauthorized' ? Lock : kind === 'notfound' ? SearchX : TriangleAlert;
  return <EmptyState icon={icon} title={title} description={message} action={onRetry && <Button variant="tonal" onClick={onRetry}>Try again</Button>} />;
}
