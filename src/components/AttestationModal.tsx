/**
 * AttestationModal — SEC Rule 206(4)-7 principal review; FINRA Rule 3110(b)(2) where applicable
 *
 * Collects the registered principal's name, CRD number, and firm name.
 * Validates the CRD number live against the FINRA BrokerCheck public API on blur.
 * Generates a formal attestation text and submits it to the backend for
 * persistent storage as written supervisory review evidence.
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/mvp/primitives/dialog";
import { Button } from "@/components/mvp/primitives/button";
import { Input } from "@/components/mvp/primitives/input";
import { Label } from "@/components/mvp/primitives/label";
import { Badge } from "@/components/mvp/primitives/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Shield, AlertTriangle, Loader2, XCircle, ExternalLink } from "lucide-react";

interface AttestationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  fileName: string;
  onAttested?: (attestedAt: string) => void;
}

export function AttestationModal({
  open,
  onOpenChange,
  sessionId,
  fileName,
  onAttested,
}: AttestationModalProps) {
  const [principalName, setPrincipalName] = useState("");
  const [crdNumber, setCrdNumber] = useState("");
  const [firmName, setFirmName] = useState("");
  const [attested, setAttested] = useState(false);
  const [attestedAt, setAttestedAt] = useState<string | null>(null);
  const [attestationText, setAttestationText] = useState<string | null>(null);

  // CRD validation state
  const [crdToValidate, setCrdToValidate] = useState<string | null>(null);
  const [crdValidated, setCrdValidated] = useState(false);

  // Trigger BrokerCheck lookup when crdToValidate is set
  const crdQuery = trpc.brokercheck.validateCrd.useQuery(
    { crdNumber: crdToValidate ?? "" },
    {
      enabled: !!crdToValidate && crdToValidate.length >= 4,
      retry: false,
      staleTime: 5 * 60 * 1000, // cache 5 min
    }
  );

  const handleCrdBlur = useCallback(() => {
    const cleaned = crdNumber.trim().replace(/\D/g, "");
    if (cleaned.length >= 4) {
      setCrdToValidate(cleaned);
      setCrdValidated(false);
    } else {
      setCrdToValidate(null);
    }
  }, [crdNumber]);

  // Auto-fill name/firm from BrokerCheck result if fields are empty
  const bcResult = crdQuery.data;
  const handleUseBcData = () => {
    if (bcResult?.valid) {
      if (!principalName.trim() && bcResult.name) setPrincipalName(bcResult.name);
      if (!firmName.trim() && bcResult.firm) setFirmName(bcResult.firm);
      setCrdValidated(true);
    }
  };

  const submitMutation = trpc.attestation.submit.useMutation({
    onSuccess: (data) => {
      setAttested(true);
      setAttestedAt(data.attestedAt);
      setAttestationText(data.attestationText);
      onAttested?.(data.attestedAt);
    },
  });

  const canSubmit =
    principalName.trim().length >= 2 &&
    crdNumber.trim().length >= 1 &&
    !submitMutation.isPending &&
    !attested;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitMutation.mutate({
      sessionId,
      principalName: principalName.trim(),
      crdNumber: crdNumber.trim(),
      firmName: firmName.trim() || undefined,
    });
  };

  // CRD validation UI state
  const showCrdValidation = !!crdToValidate && crdToValidate.length >= 4;
  const crdLoading = crdQuery.isFetching;
  const crdValid = bcResult?.valid === true;
  const crdInvalid = bcResult?.valid === false && !crdLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-amber-400" />
            <Badge
              variant="outline"
              className="text-amber-400 border-amber-400/40 bg-amber-400/10 text-xs font-mono"
            >
              SEC 206(4)-7 principal review · FINRA 3110(b)(2)
            </Badge>
          </div>
          <DialogTitle className="text-zinc-100 text-lg">
            Principal Review Attestation
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm leading-relaxed">
            As a registered principal, you are required to review and attest to
            this IC memo before it is relied upon for investment decisions. This
            attestation is stored as written supervisory review evidence.
          </DialogDescription>
        </DialogHeader>

        {!attested ? (
          <div className="space-y-4 py-2">
            {/* Document reference */}
            <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3">
              <p className="text-xs text-zinc-500 mb-1">Document under review</p>
              <p className="text-sm text-zinc-200 font-mono truncate">{fileName}</p>
              <p className="text-xs text-zinc-500 mt-1 font-mono">Session: {sessionId}</p>
            </div>

            {/* CRD Number — first so BrokerCheck can pre-fill name/firm */}
            <div className="space-y-1.5">
              <Label htmlFor="crdNumber" className="text-zinc-300 text-sm">
                CRD Number <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="crdNumber"
                  placeholder="e.g. 1234567"
                  value={crdNumber}
                  onChange={(e) => {
                    setCrdNumber(e.target.value);
                    setCrdToValidate(null); // reset validation on change
                  }}
                  onBlur={handleCrdBlur}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/50 pr-8"
                />
                {/* Inline validation icon */}
                {showCrdValidation && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {crdLoading && <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />}
                    {!crdLoading && crdValid && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                    {!crdLoading && crdInvalid && <XCircle className="h-4 w-4 text-red-400" />}
                  </span>
                )}
              </div>

              {/* BrokerCheck result banner */}
              {showCrdValidation && !crdLoading && crdValid && bcResult && (
                <div className="rounded-md bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-emerald-300 font-medium">
                      ✓ Verified via FINRA BrokerCheck
                    </p>
                    {bcResult.name && (
                      <p className="text-xs text-emerald-200 mt-0.5">
                        {bcResult.name}{bcResult.firm ? ` · ${bcResult.firm}` : ""}{bcResult.status ? ` · ${bcResult.status}` : ""}
                      </p>
                    )}
                  </div>
                  {(bcResult.name || bcResult.firm) && !crdValidated && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUseBcData}
                      className="text-xs border-emerald-700 text-emerald-300 hover:bg-emerald-900/30 shrink-0 h-7 px-2"
                    >
                      Use this data
                    </Button>
                  )}
                </div>
              )}
              {showCrdValidation && !crdLoading && crdInvalid && (
                <div className="rounded-md bg-red-950/40 border border-red-800/40 px-3 py-2">
                  <p className="text-xs text-red-300">
                    {bcResult?.error ?? "CRD not found in BrokerCheck."}{" "}
                    <a
                      href={`https://brokercheck.finra.org/individual/summary/${crdNumber.trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-red-200 hover:text-red-100 inline-flex items-center gap-0.5"
                    >
                      Search manually <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              )}

              <p className="text-xs text-zinc-500">
                Your FINRA CRD registration number. Validated live against{" "}
                <a
                  href="https://brokercheck.finra.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-400 underline"
                >
                  BrokerCheck
                </a>
                .
              </p>
            </div>

            {/* Principal Name */}
            <div className="space-y-1.5">
              <Label htmlFor="principalName" className="text-zinc-300 text-sm">
                Principal Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="principalName"
                placeholder="e.g. Jane Smith"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/50"
              />
            </div>

            {/* Firm Name (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="firmName" className="text-zinc-300 text-sm">
                Firm Name <span className="text-zinc-500">(optional)</span>
              </Label>
              <Input
                id="firmName"
                placeholder="e.g. Acme Capital Partners LLC"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/50"
              />
            </div>

            {/* Attestation preview */}
            {principalName.trim().length >= 2 && crdNumber.trim().length >= 1 && (
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/60 px-4 py-3">
                <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">
                  Attestation Text Preview
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed italic">
                  I, {principalName.trim()} (CRD: {crdNumber.trim()}), a registered principal
                  {firmName.trim() ? ` of ${firmName.trim()},` : ","} hereby attest that I have
                  reviewed the Investment Committee memorandum for session {sessionId} generated
                  by Simpero. This review was conducted in accordance with SEC Rule 206(4)-7
                  (principal review / AI compliance program expectations) and, where applicable, FINRA Rule 3110(b)(2) supervisory requirements.
                </p>
              </div>
            )}

            {submitMutation.isError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-950/40 border border-red-800/40 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">
                  {submitMutation.error?.message ?? "Failed to submit attestation. Please try again."}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Success state */
          <div className="py-4 space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-zinc-100 font-medium">Attestation Recorded</p>
                <p className="text-zinc-400 text-sm mt-1">
                  {attestedAt
                    ? `Attested on ${new Date(attestedAt).toLocaleString()}`
                    : "Attestation timestamp recorded"}
                </p>
              </div>
            </div>

            {attestationText && (
              <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3">
                <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">
                  Attestation Record
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed italic">
                  {attestationText}
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-emerald-950/30 border border-emerald-800/30 px-3 py-2">
              <Shield className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-300">
                This attestation has been stored as written supervisory review evidence
                in compliance with SEC Rule 206(4)-7 principal-review obligations (and FINRA Rule 3110(b)(2) where applicable). It will appear on the exported
                PDF as Exhibit A.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!attested ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                disabled={submitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Submit Attestation
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
