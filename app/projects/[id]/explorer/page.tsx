"use client"

import { useParams } from "next/navigation"
import { useAppContext } from "@/lib/AppContext"
import { ProjectExplorerView } from "@/components/projects/ProjectExplorerView"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ProjectExplorerPage() {
    const params = useParams()
    const projectId = params.id as string

    const { projects } = useAppContext()

    if (!projects) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-brand-500 animate-spin" />
                    <h3 className="text-lg font-semibold mb-2">Loading Project</h3>
                    <p className="text-sm text-muted-foreground">Fetching project data...</p>
                </div>
            </div>
        )
    }

    const project = projects.find((p) => p.id === projectId)

    if (!project) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
                    <h3 className="text-xl font-semibold mb-2">Project Not Found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        The project you're looking for doesn't exist or you don't have access to it.
                    </p>
                    <Link href="/projects">
                        <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                            Back to Projects
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return <ProjectExplorerView project={project} />
}
