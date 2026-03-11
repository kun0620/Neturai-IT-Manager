type Props = {
  assetId: string;
  fields: {
    id: string;
    key: string;
    label: string;
  }[];
  values: Record<string, string>;
};

export function AssetDynamicSection({
  fields,
  values,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      {fields.map((f) => (
        <div key={f.id}>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {f.label}
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {values[f.key] || '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

