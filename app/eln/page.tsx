"use client"

import { Suspense } from "react"
import { ElectronicLabNotebook } from "@/components/views/ElectronicLabNotebook"
import { useSearchParams } from "next/navigation"

export default function ELNPage() {
  return (
    <Suspense fallback={<ElectronicLabNotebook initialExperimentId={undefined} />}>
      <ELNPageInner />
    </Suspense>
  )
}

function ELNPageInner() {
  const searchParams = useSearchParams()
  return <ElectronicLabNotebook initialExperimentId={searchParams.get("experimentId") || undefined} />
}
