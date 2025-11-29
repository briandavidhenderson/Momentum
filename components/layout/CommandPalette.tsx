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
    FileText
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

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()
    const {
        projects,
        equipment,
        allProfiles,
        currentUserProfile
    } = useAppContext()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            {/* Trigger Button (Visible on Desktop) */}
            <button
                onClick={() => setOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md border border-transparent hover:border-border transition-colors w-64"
            >
                <Search className="h-4 w-4" />
                <span>Search...</span>
                <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            {/* Mobile Trigger (Icon Only) */}
            <button
                onClick={() => setOpen(true)}
                className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            >
                <Search className="h-5 w-5" />
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    {/* Navigation Group */}
                    <CommandGroup heading="Navigation">
                        <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
                            <Layout className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/projects'))}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Projects</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/equipment'))}>
                            <Wrench className="mr-2 h-4 w-4" />
                            <span>Equipment</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/inventory'))}>
                            <Package className="mr-2 h-4 w-4" />
                            <span>Inventory</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    {/* Projects Group */}
                    <CommandGroup heading="Projects">
                        {projects.slice(0, 5).map((project) => (
                            <CommandItem
                                key={project.id}
                                onSelect={() => runCommand(() => router.push(`/projects/${project.id}/explorer`))}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                <span>{project.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator />

                    {/* Equipment Group */}
                    <CommandGroup heading="Equipment">
                        {equipment.slice(0, 5).map((device) => (
                            <CommandItem
                                key={device.id}
                                onSelect={() => runCommand(() => router.push(`/equipment?device=${device.id}`))}
                            >
                                <Wrench className="mr-2 h-4 w-4" />
                                <span>{device.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator />

                    {/* People Group */}
                    <CommandGroup heading="People">
                        {allProfiles.slice(0, 5).map((profile) => (
                            <CommandItem
                                key={profile.id}
                                onSelect={() => runCommand(() => router.push(`/people/${profile.id}`))}
                            >
                                <User className="mr-2 h-4 w-4" />
                                <span>{profile.firstName} {profile.lastName}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator />

                    {/* Actions Group */}
                    <CommandGroup heading="Actions">
                        <CommandItem onSelect={() => runCommand(() => router.push('/equipment?action=book'))}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Book Equipment</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/projects?action=new'))}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Create Project</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
