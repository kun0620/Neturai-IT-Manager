type Diff = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

const stringify = (v: unknown) =>
  v === undefined || v === null ? null : String(v);

export function diffAsset(
  before: Record<string, any>,
  after: Record<string, any>,
  fields: string[]
): Diff[] {
  return fields
    .map((field) => {
      const oldV = stringify(before[field]);
      const newV = stringify(after[field]);
      if (oldV === newV) return null;
      return { field, oldValue: oldV, newValue: newV };
    })
    .filter(Boolean) as Diff[];
}
