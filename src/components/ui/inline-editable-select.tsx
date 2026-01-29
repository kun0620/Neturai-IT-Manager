import { useState } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

/* ================= GENERIC ================= */

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T | null;
  options: Option<T>[];
  placeholder?: string;
  onSave: (next: T | null) => Promise<void>;
};

/* ================= COMPONENT ================= */

export function InlineEditableSelect<T extends string>({
  value,
  options,
  placeholder = '—',
  onSave,
}: Props<T>) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    const current = options.find((o) => o.value === value);

    return (
      <div className="flex items-center gap-2">
        <span>{current?.label ?? placeholder}</span>
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
    <Select
        value={value ?? ''}
        onValueChange={async (v) => {
            const option = options.find((o) => o.value === v);
            if (!option) return;

            await onSave(option.value);
            setEditing(false);
        }}
        >
      <SelectTrigger className="h-8">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
