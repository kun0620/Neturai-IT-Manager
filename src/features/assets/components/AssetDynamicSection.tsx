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
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.id}>
          <div className="text-xs text-muted-foreground mb-1">
            {f.label}
          </div>
          <div className="text-sm">
            {values[f.key] || '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

