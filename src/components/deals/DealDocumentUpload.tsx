import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileUp } from "lucide-react";
import { Spinner } from "@/components/mvp/primitives";
import { useUploadDocument } from "@/hooks/useUploadDocument";
import { DEFAULT_MAX_UPLOAD_BYTES } from "@/lib/fileValidation";
import type { CompletedUpload } from "@/api/documents";

// Mirrors the backend's `_ALLOWED_EXTENSIONS` (app/api/uploads.py) exactly — no .ppt, includes .csv.
const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
};

const STATUS_LABELS: Record<string, string> = {
  ocr_needed: "Scanned document — text extraction needed before analysis",
  pending: "Document uploaded — verification pending",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? `Document uploaded — status: ${status}`;
}

interface DealDocumentUploadProps {
  dealId: string;
  onUploaded?: (upload: CompletedUpload) => void;
  /** Backend hard-caps at 10MB server-side (MAX_UPLOAD_BYTES in Simpero_AI_Gov_Alpha/app/api/uploads.py) — raising this above 10MB just gets rejected server-side until/unless that changes too. */
  maxBytes?: number;
}

/** Single-file dropzone for the presigned-URL upload flow. Mountable anywhere a dealId is available. */
export function DealDocumentUpload({ dealId, onUploaded, maxBytes = DEFAULT_MAX_UPLOAD_BYTES }: DealDocumentUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const mutation = useUploadDocument(dealId, { maxBytes });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setFileName(file.name);
      mutation.mutate(file, { onSuccess: (result) => onUploaded?.(result) });
    },
    [mutation, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    maxSize: maxBytes,
    disabled: mutation.isPending,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          mutation.isPending ? "cursor-wait opacity-70" : "cursor-pointer"
        } ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 bg-gray-50"
        }`}
        data-testid="deal-document-dropzone"
      >
        <input {...getInputProps()} data-testid="deal-document-upload-input" />
        <FileUp className="w-8 h-8 mx-auto mb-2 text-amber-500" />
        {mutation.isPending ? (
          <p className="text-sm text-gray-700 flex items-center justify-center gap-2">
            <Spinner /> Uploading…
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-1">
              Drag and drop or <span className="text-blue-600 underline font-medium">browse files</span>
            </p>
            <p className="text-xs text-gray-400">
              PDF, DOC, DOCX, XLS, XLSX, CSV, PPTX — up to {Math.round(maxBytes / (1024 * 1024))} MB
            </p>
          </>
        )}
      </div>

      {mutation.isSuccess && mutation.data && (
        <div
          className="mt-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800"
          data-testid="deal-document-upload-status"
        >
          {fileName ? `${fileName} — ` : ""}
          {statusLabel(mutation.data.status)}
        </div>
      )}
    </div>
  );
}
