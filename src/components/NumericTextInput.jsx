import { normalizeNumericInput } from '../utils/numericInput';

export default function NumericTextInput({ id, value, onChange, min, ...props }) {
  return (
    <input
      {...props}
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(event) => onChange(normalizeNumericInput(event.target.value, min))}
    />
  );
}
