"use client"

import { useState, useEffect } from 'react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Folder, Box, Archive, ChevronRight, Plus } from 'lucide-react'
import { StorageLocation } from '@/lib/types/sample.types'
import { getStorageLocations } from '@/lib/services/sampleService'
import { useAppContext } from '@/lib/AppContext'
import { CreateStorageLocationDialog } from './CreateStorageLocationDialog'

interface StorageBrowserProps {
    onSelectLocation: (location: StorageLocation) => void
}

export function StorageBrowser({ onSelectLocation }: StorageBrowserProps) {
    const { currentUserProfile } = useAppContext()
    const [locations, setLocations] = useState<StorageLocation[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPath, setCurrentPath] = useState<StorageLocation[]>([])
    const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    useEffect(() => {
        if (currentUserProfile?.labId) {
            loadLocations()
        }
    }, [currentUserProfile?.labId])

    async function loadLocations() {
        if (!currentUserProfile?.labId) return
        setLoading(true)
        try {
            const data = await getStorageLocations(currentUserProfile.labId)
            setLocations(data)
        } catch (error) {
            console.error('Failed to load storage locations', error)
        } finally {
            setLoading(false)
        }
    }

    const currentItems = locations.filter(loc => loc.parentId === currentParentId)

    const handleNavigate = (location: StorageLocation) => {
        setCurrentPath([...currentPath, location])
        setCurrentParentId(location.id)
    }

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setCurrentPath([])
            setCurrentParentId(undefined)
        } else {
            const newPath = currentPath.slice(0, index + 1)
            setCurrentPath(newPath)
            setCurrentParentId(newPath[newPath.length - 1].id)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'room': return <Archive className="h-5 w-5 text-blue-500" />
            case 'freezer':
            case 'fridge': return <Archive className="h-5 w-5 text-cyan-500" />
            case 'shelf':
            case 'rack': return <Folder className="h-5 w-5 text-yellow-500" />
            case 'box': return <Box className="h-5 w-5 text-green-500" />
            default: return <Folder className="h-5 w-5 text-gray-500" />
        }
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                className="cursor-pointer"
                                onClick={() => handleBreadcrumbClick(-1)}
                            >
                                Root
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {currentPath.map((item, index) => (
                            <div key={item.id} className="flex items-center">
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink
                                        className="cursor-pointer"
                                        onClick={() => handleBreadcrumbClick(index)}
                                    >
                                        {item.name}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </div>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
                <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    New Location
                </Button>
            </div>

            <CreateStorageLocationDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onLocationCreated={loadLocations}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">Loading storage...</div>
                ) : currentItems.length === 0 ? (
                    <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No items in this location.</p>
                        <Button variant="link" className="mt-2" onClick={() => setCreateDialogOpen(true)}>Create new sub-location</Button>
                    </div>
                ) : (
                    currentItems.map((item) => (
                        <Card
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleNavigate(item)}
                        >
                            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                {getIcon(item.type)}
                                <div className="font-medium truncate w-full" title={item.name}>{item.name}</div>
                                <Badge variant="secondary" className="text-xs uppercase scale-90">{item.type}</Badge>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
