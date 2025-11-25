"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Microscope, Package, Presentation, Lightbulb, Search, Check, Layout, FileText } from "lucide-react"
import { useAppContext } from "@/lib/AppContext"
import { ResearchPin } from "@/lib/types"
import { subscribeToResearchPins } from "@/lib/services/researchService"

interface ResourceLinkingDialogProps {
    open: boolean
    onClose: () => void
    onLink: (resources: {
        equipmentIds?: string[]
        inventoryIds?: string[]
        whiteboardIds?: string[]
        researchPinIds?: string[]
    }) => void
    initialLinks?: {
        equipmentIds?: string[]
        inventoryIds?: string[]
        whiteboardIds?: string[]
        researchPinIds?: string[]
    }
}

export function ResourceLinkingDialog({ open, onClose, onLink, initialLinks }: ResourceLinkingDialogProps) {
    const { equipment, inventory, whiteboards, currentUserProfile, currentUser } = useAppContext()

    const [selectedEquipment, setSelectedEquipment] = useState<string[]>(initialLinks?.equipmentIds || [])
    const [selectedInventory, setSelectedInventory] = useState<string[]>(initialLinks?.inventoryIds || [])
    const [selectedWhiteboards, setSelectedWhiteboards] = useState<string[]>(initialLinks?.whiteboardIds || [])
    const [selectedPins, setSelectedPins] = useState<string[]>(initialLinks?.researchPinIds || [])

    const [equipmentSearch, setEquipmentSearch] = useState("")
    const [inventorySearch, setInventorySearch] = useState("")
    const [whiteboardSearch, setWhiteboardSearch] = useState("")
    const [pinSearch, setPinSearch] = useState("")

    const [pins, setPins] = useState<ResearchPin[]>([])

    useEffect(() => {
        if (!currentUserProfile?.labId || !currentUser?.uid) return

        const unsubscribe = subscribeToResearchPins(
            { labId: currentUserProfile.labId, userId: currentUser.uid },
            (fetchedPins) => setPins(fetchedPins)
        )
        return () => unsubscribe()
    }, [currentUserProfile?.labId, currentUser?.uid])

    useEffect(() => {
        if (open) {
            setSelectedEquipment(initialLinks?.equipmentIds || [])
            setSelectedInventory(initialLinks?.inventoryIds || [])
            setSelectedWhiteboards(initialLinks?.whiteboardIds || [])
            setSelectedPins(initialLinks?.researchPinIds || [])
        }
    }, [open, initialLinks])

    const toggleEquipment = (id: string) => {
        setSelectedEquipment(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleInventory = (id: string) => {
        setSelectedInventory(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleWhiteboard = (id: string) => {
        setSelectedWhiteboards(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const togglePin = (id: string) => {
        setSelectedPins(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleSave = () => {
        onLink({
            equipmentIds: selectedEquipment.length > 0 ? selectedEquipment : undefined,
            inventoryIds: selectedInventory.length > 0 ? selectedInventory : undefined,
            whiteboardIds: selectedWhiteboards.length > 0 ? selectedWhiteboards : undefined,
            researchPinIds: selectedPins.length > 0 ? selectedPins : undefined,
        })
        onClose()
    }

    const filteredEquipment = equipment?.filter(e =>
        e.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        e.type?.toLowerCase().includes(equipmentSearch.toLowerCase())
    ) || []

    const filteredInventory = inventory?.filter(i =>
        i.productName.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        i.catNum?.toLowerCase().includes(inventorySearch.toLowerCase())
    ) || []

    const filteredWhiteboards = whiteboards?.filter(w =>
        w.id && w.name.toLowerCase().includes(whiteboardSearch.toLowerCase())
    ) || []

    const filteredPins = pins?.filter(p =>
    (p.title?.toLowerCase().includes(pinSearch.toLowerCase()) ||
        p.content?.toLowerCase().includes(pinSearch.toLowerCase()))
    ) || []

    const totalSelected = selectedEquipment.length + selectedInventory.length +
        selectedWhiteboards.length + selectedPins.length

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Link Resources to Experiment</DialogTitle>
                    <DialogDescription>
                        Connect equipment, inventory, whiteboards, and research topics to this experiment cell.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="equipment" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="equipment" className="gap-2">
                            <Microscope className="h-4 w-4" />
                            Equipment
                            {selectedEquipment.length > 0 && <Badge variant="secondary" className="ml-1">{selectedEquipment.length}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="gap-2">
                            <Package className="h-4 w-4" />
                            Inventory
                            {selectedInventory.length > 0 && <Badge variant="secondary" className="ml-1">{selectedInventory.length}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="whiteboards" className="gap-2">
                            <Presentation className="h-4 w-4" />
                            Whiteboards
                            {selectedWhiteboards.length > 0 && <Badge variant="secondary" className="ml-1">{selectedWhiteboards.length}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="topics" className="gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Topics
                            {selectedPins.length > 0 && <Badge variant="secondary" className="ml-1">{selectedPins.length}</Badge>}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="equipment" className="flex-1 overflow-y-auto mt-4 space-y-3">
                        <div className="sticky top-0 bg-white pb-3 z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search equipment..."
                                    value={equipmentSearch}
                                    onChange={(e) => setEquipmentSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {filteredEquipment.map(eq => (
                                <div
                                    key={eq.id}
                                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                    onClick={() => toggleEquipment(eq.id)}
                                >
                                    <Checkbox
                                        checked={selectedEquipment.includes(eq.id)}
                                        onCheckedChange={() => toggleEquipment(eq.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{eq.name}</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {eq.type} • {eq.workingLabName || 'No location'}
                                        </p>
                                    </div>
                                    <Badge variant={eq.bookingSettings ? 'default' : 'secondary'}>
                                        {eq.bookingSettings ? 'Bookable' : 'Not bookable'}
                                    </Badge>
                                </div>
                            ))}
                            {filteredEquipment.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No equipment found</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="inventory" className="flex-1 overflow-y-auto mt-4 space-y-3">
                        <div className="sticky top-0 bg-white pb-3 z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search inventory..."
                                    value={inventorySearch}
                                    onChange={(e) => setInventorySearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {filteredInventory.map(item => (
                                <div
                                    key={item.id}
                                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                    onClick={() => toggleInventory(item.id)}
                                >
                                    <Checkbox
                                        checked={selectedInventory.includes(item.id)}
                                        onCheckedChange={() => toggleInventory(item.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{item.productName}</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {item.catNum ? `Cat# ${item.catNum}` : 'No catalog number'} •
                                            {item.currentQuantity} units
                                        </p>
                                    </div>
                                    <Badge variant={item.currentQuantity > 0 ? 'default' : 'destructive'}>
                                        {item.currentQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                                    </Badge>
                                </div>
                            ))}
                            {filteredInventory.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No inventory items found</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="whiteboards" className="flex-1 overflow-y-auto mt-4 space-y-3">
                        <div className="sticky top-0 bg-white pb-3 z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search whiteboards..."
                                    value={whiteboardSearch}
                                    onChange={(e) => setWhiteboardSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {filteredWhiteboards.map(wb => (
                                <div
                                    key={wb.id}
                                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                    onClick={() => toggleWhiteboard(wb.id!)}
                                >
                                    <Checkbox
                                        checked={selectedWhiteboards.includes(wb.id!)}
                                        onCheckedChange={() => toggleWhiteboard(wb.id!)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{wb.name}</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {wb.shapes?.length || 0} items • Last updated {new Date(wb.updatedAt || wb.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge variant="secondary">
                                        <Layout className="h-3 w-3 mr-1" />
                                        Whiteboard
                                    </Badge>
                                </div>
                            ))}
                            {filteredWhiteboards.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No whiteboards found</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="topics" className="flex-1 overflow-y-auto mt-4 space-y-3">
                        <div className="sticky top-0 bg-white pb-3 z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search research topics..."
                                    value={pinSearch}
                                    onChange={(e) => setPinSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {filteredPins.map(pin => (
                                <div
                                    key={pin.id}
                                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                    onClick={() => togglePin(pin.id)}
                                >
                                    <Checkbox
                                        checked={selectedPins.includes(pin.id)}
                                        onCheckedChange={() => togglePin(pin.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{pin.title || "Untitled Pin"}</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {pin.type} • {pin.author?.name || "Unknown Author"}
                                        </p>
                                    </div>
                                    <Badge variant="secondary">
                                        <Lightbulb className="h-3 w-3 mr-1" />
                                        {pin.type}
                                    </Badge>
                                </div>
                            ))}
                            {filteredPins.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No research topics found</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                        {totalSelected > 0 ? (
                            <span className="flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                {totalSelected} resource{totalSelected !== 1 ? 's' : ''} selected
                            </span>
                        ) : (
                            <span>No resources selected</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}>Save Links</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
