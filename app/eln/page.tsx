import { ElectronicLabNotebook } from "@/components/views/ElectronicLabNotebook"

export default function ELNPage({ searchParams }: { searchParams: { experimentId?: string } }) {
  return <ElectronicLabNotebook initialExperimentId={searchParams?.experimentId} />
}
