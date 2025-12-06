import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Loader2, FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { getBuffersForLab } from "@/lib/bufferService"
import { Buffer } from "@/lib/protocol/types"

interface BufferPickerProps {
    onSelect: (buffer: Buffer) => void
    placeholder?: string
    labId?: string
    trigger?: React.ReactNode
}

export function BufferPicker({ onSelect, placeholder = "Select buffer...", labId, trigger }: BufferPickerProps) {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState("")
    const [buffers, setBuffers] = useState<Buffer[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadBuffers = async () => {
            if (!labId) return
            setLoading(true)
            try {
                const data = await getBuffersForLab(labId)
                setBuffers(data)
            } catch (error) {
                console.error("Failed to load buffers", error)
            } finally {
                setLoading(false)
            }
        }
        if (open) {
            loadBuffers()
        }
    }, [open, labId])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                        disabled={!labId}
                    >
                        {value
                            ? buffers.find((b) => b.id === value)?.name
                            : (loading ? "Loading..." : placeholder)}
                        {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search buffers..." />
                    <CommandList>
                        <CommandEmpty>No buffers found.</CommandEmpty>
                        <CommandGroup>
                            {buffers.map((buffer) => (
                                <CommandItem
                                    key={buffer.id}
                                    value={buffer.name}
                                    onSelect={() => {
                                        setValue(buffer.id)
                                        onSelect(buffer)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === buffer.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{buffer.name}</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1">{buffer.description}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
