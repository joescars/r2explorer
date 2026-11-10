import { useState } from 'react';
import { Download, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { ThemeToggle } from '../components/Shell';
import { Breadcrumbs, Button, Card, Chip, ConfirmDialog, EmptyState, IconButton, LinearProgress, Skeleton, TextField, useSnackbar } from '../ui';

const roles = ['primary', 'primary-container', 'secondary-container', 'tertiary-container', 'error', 'error-container', 'surface', 'surface-low', 'surface-container', 'surface-high', 'surface-highest', 'outline-variant'];
const text: Record<string, string> = { primary: 'on-primary', 'primary-container': 'on-primary-container', 'secondary-container': 'on-secondary-container', 'tertiary-container': 'on-tertiary-container', error: 'on-error', 'error-container': 'on-error-container' };

export function Design() {
  const [open, setOpen] = useState(false);
  const snack = useSnackbar();
  return (
    <div className="min-h-dvh bg-background pb-16">
      <header className="sticky top-0 z-30 flex h-16 items-center bg-background/90 px-4 backdrop-blur"><h1 className="flex-1 text-[22px]">Design system</h1><ThemeToggle /></header>
      <div className="mx-auto max-w-4xl space-y-8 px-4">
        <section><h2 className="mb-3 text-lg">Color roles</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{roles.map((r) => (
            <div key={r} className={`h-16 rounded-xl border border-outline-variant p-2 text-xs bg-${r} text-${text[r] ?? 'on-surface'}`}>{r}</div>))}</div></section>
        <section><h2 className="mb-3 text-lg">Buttons</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<Plus className="h-4 w-4" />}>Filled</Button><Button variant="tonal">Tonal</Button><Button variant="outlined">Outlined</Button>
            <Button variant="text">Text</Button><Button variant="danger">Danger</Button><Button loading>Loading</Button><Button disabled>Disabled</Button>
            <IconButton label="Download"><Download className="h-5 w-5" /></IconButton><IconButton label="Delete"><Trash2 className="h-5 w-5" /></IconButton></div></section>
        <section><h2 className="mb-3 text-lg">Text fields</h2>
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="Filename" placeholder="report.pdf" helpText="Helper text" /><TextField label="With error" defaultValue="oops" errorText="Something is wrong" /></div></section>
        <section><h2 className="mb-3 text-lg">Breadcrumbs, chips</h2>
          <Breadcrumbs items={[{ label: 'Buckets' , onClick() {} }, { label: 'family-backups', icon: <FolderOpen className="h-4 w-4" />, onClick() {} }, { label: 'documents' }]} />
          <div className="mt-3 flex gap-2"><Chip>Neutral</Chip><Chip tone="primary">Primary</Chip><Chip tone="success">Success</Chip><Chip tone="error">Error</Chip></div></section>
        <section><h2 className="mb-3 text-lg">Progress & skeleton</h2>
          <LinearProgress /><div className="mt-4 space-y-2"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-4 w-2/3" /></div></section>
        <section><h2 className="mb-3 text-lg">Cards, empty state</h2>
          <div className="grid gap-3 sm:grid-cols-3"><Card variant="filled" className="p-4">Filled</Card><Card variant="elevated" className="p-4">Elevated</Card><Card variant="outlined" className="p-4">Outlined</Card></div>
          <EmptyState className="mt-4" icon={FolderOpen} title="This folder is empty" description="There are no files here yet." action={<Button variant="tonal">Go back</Button>} /></section>
        <section><h2 className="mb-3 text-lg">Dialog & snackbar</h2>
          <div className="flex gap-3"><Button variant="outlined" onClick={() => setOpen(true)}>Open dialog</Button><Button variant="outlined" onClick={() => snack('File deleted', { action: { label: 'Undo', onClick() {} } })}>Show snackbar</Button></div></section>
      </div>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={() => setOpen(false)} title="Delete this file?" message="It will be permanently deleted." confirmLabel="Delete" />
    </div>
  );
}
