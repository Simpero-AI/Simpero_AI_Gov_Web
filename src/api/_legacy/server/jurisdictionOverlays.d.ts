/**
 * Simpero Jurisdiction Overlay Library — V1.0
 *
 * Defines per-jurisdiction methodology amendments that are injected into
 * section agent system prompts before Pass 1 runs.
 *
 * Each overlay is a structured set of amendments keyed by section agent name.
 * When the JurisdictionAgent resolves a jurisdiction, it returns the matching
 * overlay. The pipeline then prepends each section's overlay text to the
 * section agent's system prompt, so the agent reasons within the correct
 * accounting and regulatory framework.
 *
 * Overlay structure:
 *   - accounting: Accounting standard and revenue recognition rules
 *   - governance: Primary regulatory framework and compliance requirements
 *   - dataPrivacy: Data protection regime and obligations
 *   - financialReporting: Reporting standards, disclosure requirements
 *   - keyRegulations: Array of specific regulations to reference in analysis
 *   - sectionAmendments: Per-section-agent prompt amendments (keyed by section key)
 *
 * Supported jurisdictions: US, CA, GB, EU, AU, MULTI, UNKNOWN
 */
import type { Jurisdiction } from "./documentClassifierAgent";
export interface SectionAmendment {
    /** The section agent key this amendment applies to (matches methodology library keys) */
    sectionKey: string;
    /** Human-readable section name for logging */
    sectionName: string;
    /** Prompt text to prepend to the section agent's system prompt */
    promptAmendment: string;
}
export interface JurisdictionOverlay {
    jurisdiction: Jurisdiction;
    /** Display name for UI and PDF */
    displayName: string;
    /** Primary accounting standard */
    accountingStandard: string;
    /** Primary regulatory body */
    primaryRegulator: string;
    /** Governance framework summary (injected into GovernanceAgent) */
    governanceFramework: string;
    /** Data privacy regime */
    dataPrivacyRegime: string;
    /** Key regulations to reference throughout analysis */
    keyRegulations: string[];
    /** Per-section prompt amendments */
    sectionAmendments: SectionAmendment[];
    /** Governance agent overlay — replaces/supplements the default FINRA 3110 focus */
    governanceAgentOverlay: string;
}
export declare function getJurisdictionOverlay(jurisdiction: Jurisdiction): JurisdictionOverlay;
export declare function getAllJurisdictionOverlays(): JurisdictionOverlay[];
export declare function getSectionAmendment(jurisdiction: Jurisdiction, sectionKey: string): string | null;
export declare function getGovernanceAgentOverlay(jurisdiction: Jurisdiction): string;
