import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil } from 'lucide-react';

type Props = {
  value: string | null;
  placeholder?: string;
  onSave: (next: string | null) => Promise<void>;
};

export function InlineEditableText({
  value,
  placeholder = '—',
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await onSave(draft || null);
    setLoading(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span>{value || placeholder}</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8"
      />
      <Button size="icon" onClick={handleSave} disabled={loading}>
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          setDraft(value ?? '');
          setEditing(false);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
