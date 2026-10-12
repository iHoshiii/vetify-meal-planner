import { useEffect, useState } from 'react';
import { Field } from '../../components/ui';

export function PlanNumberField({
  label,
  value,
  onChange,
  emptyValue = null,
  placeholder,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  emptyValue?: number | null;
  placeholder?: string;
  hint?: string;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const parsed = text.trim() === '' ? emptyValue : Number(text.replace(',', '.'));
  useEffect(() => {
    if (!Object.is(value, parsed)) setText(value === null ? '' : String(value));
  }, [value, parsed]);
  return (
    <Field
      label={label}
      value={text}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      hint={hint}
      onChangeText={(next) => {
        setText(next);
        onChange(next.trim() === '' ? emptyValue : Number(next.replace(',', '.')));
      }}
    />
  );
}
