import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Empty } from "@/components/viz/empty";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-content-center bg-background">
      <Empty icon={Compass} title="No encontramos esa página" hint="Puede que el link esté viejo.">
        <Button nativeButton={false} render={<Link href="/" />}>
          Volver al inicio
        </Button>
      </Empty>
    </main>
  );
}
