import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileUp, CheckCircle2, XCircle } from "lucide-react";
import { Button, Spinner } from "@/components/mvp/primitives";
import { runPublicDocumentUpload } from "@/lib/documentUploadPipeline";
import { postIntakeSubmit } from "@/api/publicIntake";
import { DEFAULT_MAX_UPLOAD_BYTES, validateUploadFile } from "@/lib/fileValidation";

const MAX_FILES = 20;

type UploadEntry = {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  errorMessage?: string;
};

interface UploadStepProps {
  onSubmitted: () => void;
  onUnavailable: () => void;
  onBack: () => void;
}

/**
 * P4-06 — multi-file variant of the DealDocumentUpload dropzone pattern,
 * against the public /intake session routes (runPublicDocumentUpload).
 * `maxFiles` on useDropzone rejects an over-limit single drop outright
 * (before any accepted file reaches onDrop); the `room` slice below is the
 * backstop for files dropped one at a time across multiple drops.
 */
export function UploadStep({ onSubmitted, onUnavailable, onBack }: UploadStepProps) {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setEntries((prev) => {
      const room = MAX_FILES - prev.length;
      const toAdd = acceptedFiles.slice(0, Math.max(0, room));
      const next: UploadEntry[] = toAdd.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        status: "uploading",
      }));
      // react-dropzone's own accept/maxSize gate routes an oversized or
      // wrong-type file straight into fileRejections, never into
      // acceptedFiles -- so it never reached this list at all, with no
      // feedback (FE-9). Add it as its own "error" entry, re-validated via
      // the same check runPublicDocumentUpload uses, for the same message.
      const rejectedEntries: UploadEntry[] = fileRejections.slice(0, Math.max(0, room - next.length)).map((r) => {
        const result = validateUploadFile(r.file);
        return {
          id: `${r.file.name}-${r.file.size}-${Date.now()}-${Math.random()}`,
          file: r.file,
          status: "error",
          errorMessage: result.ok ? "File rejected" : result.reason,
        };
      });
      for (const entry of next) {
        runPublicDocumentUpload(entry.file)
          .then(() => {
            // An over-cap PDF never resolves here at all -- runPublicDocumentUpload
            // throws PageCountExceededError for it (enforced once, centrally
            // in documentUploadPipeline.ts), which the .catch below turns
            // into the same error entry as any other upload failure.
            setEntries((cur) => cur.map((e) => (e.id === entry.id ? { ...e, status: "done" } : e)));
          })
          .catch((err) => {
            setEntries((cur) =>
              cur.map((e) =>
                e.id === entry.id
                  ? { ...e, status: "error", errorMessage: err instanceof Error ? err.message : "Upload failed" }
                  : e
              )
            );
          });
      }
      return [...prev, ...next, ...rejectedEntries];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: MAX_FILES,
    maxSize: DEFAULT_MAX_UPLOAD_BYTES,
    disabled: entries.length >= MAX_FILES || submitting,
  });

  const completedCount = entries.filter((e) => e.status === "done").length;
  const canSubmit = completedCount >= 1 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await postIntakeSubmit();
      onSubmitted();
    } catch {
      onUnavailable();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="intake-upload-step">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Upload documents</h1>
      <p className="text-sm text-gray-500 mb-5">Upload at least one document, then submit.</p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          entries.length >= MAX_FILES ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 bg-gray-50"
        }`}
        data-testid="intake-upload-dropzone"
      >
        <input {...getInputProps()} data-testid="intake-upload-input" />
        <FileUp className="w-8 h-8 mx-auto mb-2 text-amber-500" />
        <p className="text-sm text-gray-700 mb-1">
          Drag and drop or <span className="text-blue-600 underline font-medium">browse files</span>
        </p>
        <p className="text-xs text-gray-400">Up to {MAX_FILES} files</p>
      </div>

      {entries.length > 0 && (
        <ul className="mt-4 space-y-1.5" data-testid="intake-upload-list">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-xs text-gray-700">
              {e.status === "uploading" && <Spinner className="size-3" />}
              {e.status === "done" && <CheckCircle2 className="size-3 text-emerald-500" />}
              {e.status === "error" && <XCircle className="size-3 text-red-500" />}
              <span className="truncate">{e.file.name}</span>
              {e.status === "error" && <span className="text-red-500">{e.errorMessage}</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-between mt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit} data-testid="intake-submit-button">
          {submitting ? <Spinner className="size-4" /> : "Submit"}
        </Button>
      </div>
    </div>
  );
}
