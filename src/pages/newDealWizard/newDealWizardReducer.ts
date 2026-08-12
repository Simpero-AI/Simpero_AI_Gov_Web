import type { MaterialKey } from "./deriveMaterialsAutoTick";
import type { PersistedStep1 } from "./storage";

export type UploadTab = "files" | "email" | "vdr";

export type WizardState = {
  // Step 1 — persisted to localStorage (no files)
  dealName: string;
  gpSource: string;
  dealSizeMinM: string;
  dealSizeMaxM: string;
  sectorTags: string[];
  selectedFrameworks: string[];

  // Step 2 — in-memory only
  primaryFile: File | null;
  financialModelFile: File | null;
  materialsTicked: Partial<Record<MaterialKey, boolean>>;
  uploadTab: UploadTab;
  /** Set once `DealDocumentUpload` reports at least one successful upload this session — gates the Step 3 guard (primaryFile is dead state, nothing sets it since Step2Materials was unmounted). */
  hasUploadedDocument: boolean;

  // Step 3
  submitting: boolean;
  submitError: string | null;
  conferenceMode: boolean;
  fixtureId: string;

  // Attach mode (set when /new-deal?dealId=<uuid> is loaded)
  attachDealId: string | null;
};

export type WizardAction =
  | { type: "set_field"; key: "dealName" | "gpSource" | "dealSizeMinM" | "dealSizeMaxM"; value: string }
  | { type: "toggle_sector"; tag: string }
  | { type: "toggle_framework"; id: string }
  | { type: "apply_framework_preset"; ids: string[] }
  | { type: "set_primary_file"; file: File | null }
  | { type: "set_financial_model_file"; file: File | null }
  | { type: "set_material_ticked"; key: MaterialKey; ticked: boolean }
  | { type: "set_upload_tab"; tab: UploadTab }
  | { type: "document_uploaded" }
  | { type: "submitting_start" }
  | { type: "submitting_error"; message: string }
  | { type: "set_conference_mode"; enabled: boolean }
  | { type: "set_fixture_id"; id: string }
  | { type: "rehydrate"; partial: Partial<PersistedStep1> }
  | { type: "set_attach_deal_id"; dealId: string; deal: {
      name: string; gpSource: string;
      dealSizeMinUsd: number | null; dealSizeMaxUsd: number | null;
      sectorTags: string[];
    } }
  | { type: "deal_created"; dealId: string }
  | { type: "reset" };

export function initialWizardState(defaultFrameworks: string[]): WizardState {
  return {
    dealName: "",
    gpSource: "",
    dealSizeMinM: "",
    dealSizeMaxM: "",
    sectorTags: [],
    selectedFrameworks: defaultFrameworks,

    primaryFile: null,
    financialModelFile: null,
    materialsTicked: {},
    uploadTab: "files",
    hasUploadedDocument: false,

    submitting: false,
    submitError: null,
    conferenceMode: false,
    fixtureId: "novaspark",

    attachDealId: null,
  };
}

/** Cents → millions-USD string (no trailing zeros). `300_000_000` → `"3"`; `0` → `""`. */
function centsToM(cents: number | null): string {
  if (cents == null) return "";
  const m = cents / 100_000_000;
  return Number.isFinite(m) ? String(m) : "";
}

export function newDealWizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "set_field":
      return { ...state, [action.key]: action.value } as WizardState;

    case "toggle_sector": {
      const tags = state.sectorTags.includes(action.tag)
        ? state.sectorTags.filter((t) => t !== action.tag)
        : [...state.sectorTags, action.tag];
      return { ...state, sectorTags: tags };
    }

    case "toggle_framework": {
      const has = state.selectedFrameworks.includes(action.id);
      if (has && state.selectedFrameworks.length <= 1) return state;
      const next = has
        ? state.selectedFrameworks.filter((id) => id !== action.id)
        : [...state.selectedFrameworks, action.id];
      return { ...state, selectedFrameworks: next };
    }

    case "apply_framework_preset":
      return { ...state, selectedFrameworks: action.ids };

    case "set_primary_file":
      return { ...state, primaryFile: action.file };

    case "set_financial_model_file":
      return { ...state, financialModelFile: action.file };

    case "set_material_ticked":
      return { ...state, materialsTicked: { ...state.materialsTicked, [action.key]: action.ticked } };

    case "set_upload_tab":
      return { ...state, uploadTab: action.tab };

    case "document_uploaded":
      return { ...state, hasUploadedDocument: true };

    case "submitting_start":
      return { ...state, submitting: true, submitError: null };

    case "submitting_error":
      return { ...state, submitting: false, submitError: action.message };

    case "set_conference_mode":
      return { ...state, conferenceMode: action.enabled };

    case "set_fixture_id":
      return { ...state, fixtureId: action.id };

    case "rehydrate": {
      const p = action.partial;
      return {
        ...state,
        ...(p.dealName !== undefined && { dealName: p.dealName }),
        ...(p.gpSource !== undefined && { gpSource: p.gpSource }),
        ...(p.dealSizeMinM !== undefined && { dealSizeMinM: p.dealSizeMinM }),
        ...(p.dealSizeMaxM !== undefined && { dealSizeMaxM: p.dealSizeMaxM }),
        ...(p.sectorTags !== undefined && { sectorTags: p.sectorTags }),
        ...(p.selectedFrameworks !== undefined && { selectedFrameworks: p.selectedFrameworks }),
      };
    }

    case "set_attach_deal_id":
      return {
        ...state,
        attachDealId: action.dealId,
        dealName: action.deal.name,
        gpSource: action.deal.gpSource,
        dealSizeMinM: centsToM(action.deal.dealSizeMinUsd),
        dealSizeMaxM: centsToM(action.deal.dealSizeMaxUsd),
        sectorTags: action.deal.sectorTags,
      };

    // Deal was created in-session on the Step 1 → Step 2 transition. Unlike
    // `set_attach_deal_id`, the Step 1 fields are already correct locally —
    // don't overwrite them.
    // Success terminator for the create (counterpart to `submitting_error`) — the wizard never remounts, so nothing else clears `submitting`.
    case "deal_created":
      return { ...state, attachDealId: action.dealId, submitting: false };

    case "reset":
      return initialWizardState(state.selectedFrameworks);
  }
}
