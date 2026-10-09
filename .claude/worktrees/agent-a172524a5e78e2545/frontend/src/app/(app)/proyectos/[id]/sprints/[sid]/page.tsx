"use client";

import { use } from "react";

import { SprintReport } from "@/components/project/sprint-report";

export default function SprintPage({ params }: PageProps<"/proyectos/[id]/sprints/[sid]">) {
  const { id, sid } = use(params);
  return <SprintReport project={id} sprint={sid} />;
}
