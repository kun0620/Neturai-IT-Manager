import { EditableAssetField } from '../constants/editableFields';

export function diffAsset(
  before: Record<string, any>,
  after: Record<string, any>
) {
  const changes: {
    field: EditableAssetField;
    oldValue: any;
    newValue: any;
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
