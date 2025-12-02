"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    FlaskConical,
    Layout,
    Package,
    Search,
    Wrench,
    FileText,
    ListTodo,
    BrainCircuit
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { useAppContext } from "@/lib/AppContext"
import { searchGlobal, SearchResult } from "@/lib/services/searchService"

export function CommandPalette() {
    const router = useRouter()
    const {
        projects,
        equipment,
        allProfiles,
        currentUserProfile,
        setMainView,
        commandPaletteOpen,
        setCommandPaletteOpen
    } = useAppContext()

    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<SearchResult[]>([])
    const [loading, setLoading] = React.useState(false)

    // Debounce query to avoid hammering Firestore
    // If useDebounce doesn't exist, I'll use a simple timeout effect
    const [debouncedQuery, setDebouncedQuery] = React.useState("")

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setCommandPaletteOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [setCommandPaletteOpen])

    React.useEffect(() => {
        async function performSearch() {
            if (!debouncedQuery || debouncedQuery.length < 2) {
                setResults([])
                return
            }

            if (!currentUserProfile?.labId) return

            setLoading(true)
            try {
                const searchResults = await searchGlobal(debouncedQuery, currentUserProfile.labId)
                setResults(searchResults)
            } catch (error) {
                console.error("Search failed", error)
            } finally {
                setLoading(false)
            }
        }

        performSearch()
    }, [debouncedQuery, currentUserProfile?.labId])

    const runCommand = React.useCallback((command: () => unknown) => {
        setCommandPaletteOpen(false)
        command()
    }, [setCommandPaletteOpen])

    // Group results by type
    const groupedResults = React.useMemo(() => {
        const groups: Record<string, SearchResult[]> = {
            project: [],
            sample: [],
            task: [],
            protocol: [],
            experiment: []
        }
        results.forEach(r => {
            if (groups[r.type]) groups[r.type].push(r)
        })
        return groups
    }, [results])

    return (
        <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
            <CommandInput
                placeholder="Type to search projects, samples, tasks..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>
                    {loading ? "Searching..." : "No results found."}
                </CommandEmpty>

                {/* Dynamic Search Results */}
                {groupedResults.project.length > 0 && (
                    <CommandGroup heading="Projects">
                        {groupedResults.project.map(result => (
                            <CommandItem key={result.id} onSelect={() => runCommand(() => {
                                router.push(`/projects/${result.id}`)
                            })}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>{result.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {groupedResults.sample.length > 0 && (
                    <CommandGroup heading="Samples">
                        {groupedResults.sample.map(result => (
                            <CommandItem key={result.id} onSelect={() => runCommand(() => {
                                setMainView('samples')
                                // Navigate to sample detail
                            })}>
                                <FlaskConical className="mr-2 h-4 w-4" />
                                <span>{result.title}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{result.metadata.batchNumber}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {groupedResults.task.length > 0 && (
                    <CommandGroup heading="Tasks">
                        {groupedResults.task.map(result => (
                            <CommandItem key={result.id} onSelect={() => runCommand(() => {
                                setMainView('mytasks')
                            })}>
                                <ListTodo className="mr-2 h-4 w-4" />
                                <span>{result.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {groupedResults.protocol.length > 0 && (
                    <CommandGroup heading="Protocols">
                        {groupedResults.protocol.map(result => (
                            <CommandItem key={result.id} onSelect={() => runCommand(() => {
                                setMainView('bench')
                            })}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>{result.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* Default Navigation (Show when no query) */}
                {query.length === 0 && (
                    <>
                        <CommandGroup heading="Navigation">
                            <CommandItem onSelect={() => runCommand(() => setMainView('dashboard'))}>
                                <Layout className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => setMainView('projects'))}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Projects</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => setMainView('equipment'))}>
                                <Wrench className="mr-2 h-4 w-4" />
                                <span>Equipment</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => setMainView('orders'))}>
                                <Package className="mr-2 h-4 w-4" />
                                <span>Inventory & Orders</span>
                            </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Actions">
                            <CommandItem onSelect={() => runCommand(() => setMainView('equipment'))}>
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>Book Equipment</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => setMainView('projects'))}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Create Project</span>
                            </CommandItem>
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    )
}
