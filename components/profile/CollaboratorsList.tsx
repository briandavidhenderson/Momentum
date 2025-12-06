
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CollaboratorsListProps {
    works?: {
        contributors?: string[]
    }[]
}

export function CollaboratorsList({ works = [] }: CollaboratorsListProps) {
    // Extract all contributors from all works
    const allContributors = works.flatMap(work => work.contributors || [])

    // Count frequency of each contributor
    const contributorCounts = allContributors.reduce((acc, name) => {
        acc[name] = (acc[name] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    // Convert to array of objects, sort by frequency (desc), then name (asc)
    const sortedCollaborators = Object.entries(contributorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count
            return a.name.localeCompare(b.name)
        })

    if (sortedCollaborators.length === 0) {
        return null
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Collaborators
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {sortedCollaborators.map((collaborator) => (
                        <Badge
                            key={collaborator.name}
                            variant="secondary"
                            className="flex items-center gap-1 py-1 px-2"
                        >
                            {collaborator.name}
                            <span className="ml-1 text-xs text-muted-foreground bg-background/50 px-1.5 rounded-full">
                                {collaborator.count}
                            </span>
                        </Badge>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                    * Based on co-authorship in linked publications.
                </p>
            </CardContent>
        </Card>
    )
}
