import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex border-b">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === tab.key
              // text-violet-300 instead of text-primary (which is too dark
              // against the dark dashboard bg to meet WCAG AA).
              ? "border-violet-400 text-violet-300"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
