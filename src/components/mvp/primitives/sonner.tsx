// Re-exports the shadcn Toaster component and the toast() function from
// the sonner package so pages import both through the mvp/ boundary.
// The Phase 2 Carbon migration swaps this module for a Carbon equivalent.
export * from "@/components/ui/sonner";
export { toast } from "sonner";
