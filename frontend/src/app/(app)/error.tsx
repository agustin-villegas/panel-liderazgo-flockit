"use client";

import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/panel/error-state";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <ErrorState message={error.message || "Algo salió mal."} onRetry={reset} />
    </Card>
  );
}
