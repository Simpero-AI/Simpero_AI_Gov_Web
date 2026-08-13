import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InlineRowFormProps {
  defaultEditing?: boolean;
  /** Display mode — call `startEdit()` from whatever affordance (e.g. an Edit button) triggers the switch. */
  renderDisplay: (startEdit: () => void) => ReactNode;
  /** Edit mode — call `stopEdit()` from Cancel/Save once done; the form itself owns its fields and Save wiring. */
  renderForm: (stopEdit: () => void) => ReactNode;
  className?: string;
}

/**
 * Add/edit row pattern: toggles a row between a display view and an inline
 * edit form (later: adding entities, vault docs, checklist items). Kept
 * deliberately minimal — no field schema, no built-in Save wiring — the
 * caller's `renderForm` owns its own fields and calls `stopEdit` when done.
 */
export function InlineRowForm({ defaultEditing = false, renderDisplay, renderForm, className }: InlineRowFormProps) {
  const [editing, setEditing] = useState(defaultEditing);
  return (
    <div className={cn(className)}>
      {editing ? renderForm(() => setEditing(false)) : renderDisplay(() => setEditing(true))}
    </div>
  );
}
