import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog";

export interface RegenerateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  scope: "all" | "section";
  sectionLabel?: string;
  isPending?: boolean;
}

/**
 * Scope-aware confirm dialog for IC Memo regenerate actions.
 * - scope="all": warns that current edits will be replaced (10–30 s).
 * - scope="section": confirms a per-section regen (1–3 s), other sections untouched.
 */
export function RegenerateConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  scope,
  sectionLabel,
  isPending,
}: RegenerateConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {scope === "all"
              ? "Regenerate the IC Memo?"
              : `Regenerate the ${sectionLabel ?? "section"}?`}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {scope === "all"
            ? "This re-runs every composer over the existing evidence. Current edits will be replaced. Takes about 10–30 seconds."
            : `This re-runs one composer for the ${sectionLabel ?? "section"} block. Other sections are untouched. Takes about 1–3 seconds.`}
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isPending ? "Regenerating…" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
