import { History } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/mvp/primitives/drawer";
import { EmptyState } from "@/components/mvp/common/EmptyState";

interface MandateHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmName?: string;
}

/**
 * Mandate History drawer (mockup's `historyOpen` panel) — opened from the
 * Mandate topbar's History button. There is no mandate-version-history
 * backend today (`investmentProfile` isn't versioned — plan §4c), so this
 * is an honest "not tracked yet" empty state rather than a fabricated
 * change log, same visible-disabled-explained pattern as FindingsTab.
 */
export function MandateHistoryDrawer({ open, onOpenChange, firmName }: MandateHistoryDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-[420px] sm:max-w-[420px]">
        <DrawerHeader className="border-b border-[color:var(--rev-border-subtle)] px-[22px] py-[18px] text-left">
          <DrawerTitle className="font-serif text-[17px] font-normal text-[color:var(--rev-text-1)]">
            Mandate History
          </DrawerTitle>
          <DrawerDescription className="font-mono text-xs text-[color:var(--rev-text-6)]">
            Change log{firmName ? ` · ${firmName}` : ""}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-[22px] py-10">
          <EmptyState
            icon={History}
            title="History isn't tracked yet"
            description="Changes to firm profile, mandate parameters, and the scoring framework aren't versioned yet. Once change tracking ships, this will show who changed what and when."
            className="border-none p-0"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
