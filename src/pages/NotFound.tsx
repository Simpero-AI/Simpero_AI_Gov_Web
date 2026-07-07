import { EmptyState } from "@/components/mvp/common/EmptyState";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <EmptyState
        icon={AlertCircle}
        title="Page not found"
        description="The requested route is unavailable or no longer active in this workspace."
        action={{ label: "Return home", onClick: () => setLocation("/") }}
        className="mx-auto max-w-xl"
      />
    </div>
  );
}
