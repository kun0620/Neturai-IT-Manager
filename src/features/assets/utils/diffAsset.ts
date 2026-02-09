import { EditableAssetField } from '../constants/editableFields';

export function diffAsset(
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  const changes: {
    field: EditableAssetField;
    oldValue: unknown;
    newValue: unknown;
  }[] = [];

  for (const key in after) {
    if (before[key] !== after[key]) {
      changes.push({
        field: key as EditableAssetField,
        oldValue: before[key],
        newValue: after[key],
      });
    }
  }

  return changes;
}
