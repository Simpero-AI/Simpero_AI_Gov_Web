import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Folder, X } from "lucide-react";
import { toast } from "@/components/mvp/primitives/sonner";

export const MAX_FILE_SIZE = 100 * 1024 * 1024;

const PRIMARY_EXT_RE = /\.(pdf|docx|doc|pptx|ppt)$/i;
const XLSX_EXT_RE = /\.(xlsx|xls)$/i;

interface DealMaterialsDropzoneProps {
  primaryFile: File | null;
  financialModelFile: File | null;
  onPrimaryFile: (file: File | null) => void;
  onFinancialModelFile: (file: File | null) => void;
}

export function DealMaterialsDropzone({
  primaryFile,
  financialModelFile,
  onPrimaryFile,
  onFinancialModelFile,
}: DealMaterialsDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      let assignedPrimary = false;
      let assignedFinModel = false;
      const ignored: string[] = [];

      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error("File too large", { description: `${file.name} exceeds 100MB.` });
          continue;
        }
        if (XLSX_EXT_RE.test(file.name)) {
          if (financialModelFile == null && !assignedFinModel) {
            onFinancialModelFile(file);
            assignedFinModel = true;
          } else {
            ignored.push(file.name);
          }
        } else if (PRIMARY_EXT_RE.test(file.name)) {
          if (primaryFile == null && !assignedPrimary) {
            onPrimaryFile(file);
            assignedPrimary = true;
          } else {
            ignored.push(file.name);
          }
        } else {
          toast.error("Unsupported file type", {
            description: `${file.name} — use PDF, DOCX, PPTX, or XLSX.`,
          });
        }
      }
      if (ignored.length > 0) {
        toast("Extra files ignored", {
          description: `Only one primary document + one financial model supported: ${ignored.join(", ")}`,
        });
      }
    },
    [primaryFile, financialModelFile, onPrimaryFile, onFinancialModelFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxSize: MAX_FILE_SIZE,
  });

  const fileTypeChip: Record<string, string> = {
    pdf: "bg-red-50 text-red-700 border-red-200",
    docx: "bg-blue-50 text-blue-700 border-blue-200",
    doc: "bg-blue-50 text-blue-700 border-blue-200",
    pptx: "bg-orange-50 text-orange-700 border-orange-200",
    ppt: "bg-orange-50 text-orange-700 border-orange-200",
    xlsx: "bg-emerald-50 text-emerald-700 border-emerald-200",
    xls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const renderFileRow = (file: File, onRemove: () => void, suffix: string) => {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    const chip = fileTypeChip[ext] ?? "bg-gray-100 text-gray-600 border-gray-200";
    return (
      <div
        key={`${file.name}-${file.size}-${suffix}`}
        className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg group"
        data-testid={`wizard-file-row-${suffix}`}
      >
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${chip}`}>
          {ext.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
          <div className="text-xs text-gray-400">
            {(file.size / 1024 / 1024).toFixed(1)} MB
            {suffix === "financial-model" && (
              <span className="ml-2 text-emerald-700 font-medium">Financial model</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const showSupplementaryHint = financialModelFile != null && primaryFile == null;

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition mb-5 ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 bg-gray-50"
        }`}
        data-testid="wizard-dropzone"
      >
        <input
          {...getInputProps()}
          data-testid="simpero-document-upload"
        />
        <Folder className="w-12 h-12 mx-auto mb-3 text-amber-500" />
        <p className="text-sm text-gray-700 mb-1">
          Drag and drop or <span className="text-blue-600 underline font-medium">browse files</span>
        </p>
        <p className="text-xs text-gray-400">PDF, DOCX, PPTX, XLSX — up to 100 MB</p>
      </div>

      {showSupplementaryHint && (
        <div
          className="mb-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800"
          data-testid="wizard-supplementary-hint"
        >
          XLSX captured as supplementary financial model. Drop a CIM or deck (PDF/DOCX/PPTX) as the primary document.
        </div>
      )}

      {(primaryFile || financialModelFile) && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            {[primaryFile, financialModelFile].filter(Boolean).length} file
            {[primaryFile, financialModelFile].filter(Boolean).length !== 1 ? "s" : ""} uploaded
          </div>
          {primaryFile && renderFileRow(primaryFile, () => onPrimaryFile(null), "primary")}
          {financialModelFile && renderFileRow(financialModelFile, () => onFinancialModelFile(null), "financial-model")}
        </div>
      )}
    </div>
  );
}
