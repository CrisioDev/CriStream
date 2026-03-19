interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  // Handle transparent/rgba values - show as black in the picker but preserve original
  const isTransparent = value === "transparent" || value === "";
  const inputValue = isTransparent ? "#000000" : value.startsWith("#") ? value : "#000000";

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={inputValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-border cursor-pointer p-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-8 w-full rounded-md border border-input bg-background text-foreground px-2 py-1 text-xs"
        placeholder="#ffffff"
      />
    </div>
  );
}
