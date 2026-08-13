import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/mvp/primitives/toggle-group";

export interface ScenarioOption {
  value: string;
  label: string;
}

export interface ScenarioToggleProps {
  options: ScenarioOption[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  className?: string;
}

/**
 * Thin wrapper around the shared `ToggleGroup` for named-scenario switches
 * (Downside/Base/Upside, Distressed→Upside, Base Case/Market Stress) — the
 * mockup's segmented-button scenario picker on the Financial Model, Exit
 * Waterfall, and Liquidity Diagnostics screens. Single-select only; restyles
 * `ToggleGroupItem`'s active state to the mockup's filled-pill look rather
 * than the shadcn default.
 */
export function ScenarioToggle({ options, value, onValueChange, className, ...rest }: ScenarioToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix emits "" on deselect; a single-select scenario switch always keeps one active.
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      aria-label={rest["aria-label"]}
      className={cn("gap-1.5 rounded-md bg-transparent", className)}
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          className="border-transparent bg-[color:var(--rev-tint-neutral)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[color:var(--rev-text-4)] data-[state=on]:border-transparent data-[state=on]:bg-[color:var(--rev-primary)] data-[state=on]:text-white"
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
