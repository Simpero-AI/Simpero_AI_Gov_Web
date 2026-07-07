import { useState } from "react";
import { Edit } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";

export interface EditableSectionProps {
  sectionLabel: string;
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps a deliverable section block with a hover-only Edit pencil that opens
 * a popover offering "Edit text", "Regenerate", and an optional steering-note
 * textarea piped into the regenerate handler.
 */
export function EditableSection({
  sectionLabel,
  onRegenerate,
  onEditText,
  className,
  children,
}: EditableSectionProps) {
  const [open, setOpen] = useState(false);
  const [steering, setSteering] = useState("");
  return (
    <div className={cn("relative group", className)}>
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" aria-label={`Edit ${sectionLabel}`}>
              <Edit className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {sectionLabel}
            </p>
            <Textarea
              placeholder="Optional steering note for regenerate (e.g. 'Focus on Series B comparables')"
              value={steering}
              onChange={(e) => setSteering(e.target.value)}
              className="h-20 text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onEditText();
                  setOpen(false);
                }}
              >
                Edit text
              </Button>
              <Button
                size="sm"
                className="flex-1 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  onRegenerate(steering || undefined);
                  setOpen(false);
                  setSteering("");
                }}
              >
                Regenerate
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {children}
    </div>
  );
}
