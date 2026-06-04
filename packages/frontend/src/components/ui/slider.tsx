import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /** Required for screen-reader users. Visible labels above the slider are
   * not programmatically associated, so describe the slider here. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, className, ...ariaProps }: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaProps["aria-label"]}
      aria-labelledby={ariaProps["aria-labelledby"]}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary",
        className
      )}
    />
  );
}
