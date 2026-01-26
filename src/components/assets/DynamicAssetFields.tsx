import { Control, useController } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssetField } from '@/hooks/useAssetFields';

interface Props {
  fields: AssetField[];
  control: Control<any>;
}

function DynamicFieldItem({
  field,
  control,
}: {
  field: AssetField;
  control: Control<any>;
}) {
  const { field: ctrl } = useController({
    name: `custom.${field.key}`,
    control,
    defaultValue: '', // 🔑 ตัวนี้แหละที่แก้ทุกอย่าง
  });


  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right">{field.label}</Label>
      <div className="col-span-3">
        <Input {...ctrl} />
      </div>
    </div>
  );
}

export function DynamicAssetFields({ fields, control }: Props) {
  return (
    <>
      {fields.map((field) => (
        <DynamicFieldItem
          key={field.id}
          field={field}
          control={control}
        />
      ))}
    </>
  );
}
