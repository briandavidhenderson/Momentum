"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { getFirebaseDb } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { Lab } from '@/lib/types/organization.types'
import { CustomFieldDefinition, CustomFieldType } from '@/lib/types/customFields.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Save } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export function CustomFieldEditor() {
    const { currentUserProfile } = useAuth()
    const { toast } = useToast()
    const [lab, setLab] = useState<Lab | null>(null)
    const [loading, setLoading] = useState(true)
    const [definitions, setDefinitions] = useState<{
        sample: CustomFieldDefinition[],
        protocol: CustomFieldDefinition[],
        experiment: CustomFieldDefinition[]
    }>({
        sample: [],
        protocol: [],
        experiment: []
    })

    useEffect(() => {
        if (!currentUserProfile?.labId) return

        const fetchLab = async () => {
            const db = getFirebaseDb()
            const labRef = doc(db, 'labs', currentUserProfile.labId)
            const labSnap = await getDoc(labRef)
            if (labSnap.exists()) {
                const labData = labSnap.data() as Lab
                setLab(labData)
                setDefinitions({
                    sample: labData.customFieldDefinitions?.sample || [],
                    protocol: labData.customFieldDefinitions?.protocol || [],
                    experiment: labData.customFieldDefinitions?.experiment || []
                })
            }
            setLoading(false)
        }

        fetchLab()
    }, [currentUserProfile?.labId])

    const handleAddField = (type: 'sample' | 'protocol' | 'experiment') => {
        const newField: CustomFieldDefinition = {
            id: crypto.randomUUID(),
            key: '',
            label: '',
            type: 'text'
        }
        setDefinitions(prev => ({
            ...prev,
            [type]: [...prev[type], newField]
        }))
    }

    const handleUpdateField = (
        category: 'sample' | 'protocol' | 'experiment',
        index: number,
        field: Partial<CustomFieldDefinition>
    ) => {
        setDefinitions(prev => {
            const newList = [...prev[category]]
            newList[index] = { ...newList[index], ...field }

            // Auto-generate key from label if key is empty
            if (field.label && !newList[index].key) {
                newList[index].key = field.label.toLowerCase().replace(/[^a-z0-9]/g, '_')
            }

            return { ...prev, [category]: newList }
        })
    }

    const handleRemoveField = (category: 'sample' | 'protocol' | 'experiment', index: number) => {
        setDefinitions(prev => {
            const newList = [...prev[category]]
            newList.splice(index, 1)
            return { ...prev, [category]: newList }
        })
    }

    const handleSave = async () => {
        if (!lab || !currentUserProfile?.labId) return

        try {
            const db = getFirebaseDb()
            const labRef = doc(db, 'labs', currentUserProfile.labId)
            await updateDoc(labRef, {
                customFieldDefinitions: definitions
            })
            toast({
                title: "Settings Saved",
                description: "Custom field definitions have been updated."
            })
        } catch (error) {
            console.error("Failed to save settings", error)
            toast({
                title: "Error",
                description: "Failed to save settings.",
                variant: "destructive"
            })
        }
    }

    const renderFieldEditor = (category: 'sample' | 'protocol' | 'experiment') => (
        <div className="space-y-4">
            {definitions[category].map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg bg-card">
                    <div className="grid gap-4 flex-1 md:grid-cols-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Label</label>
                            <Input
                                value={field.label}
                                onChange={(e) => handleUpdateField(category, index, { label: e.target.value })}
                                placeholder="e.g. Passage Number"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Key (Internal)</label>
                            <Input
                                value={field.key}
                                onChange={(e) => handleUpdateField(category, index, { key: e.target.value })}
                                placeholder="passage_number"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <Select
                                value={field.type}
                                onValueChange={(value) => handleUpdateField(category, index, { type: value as CustomFieldType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="checkbox">Checkbox</SelectItem>
                                    <SelectItem value="url">URL</SelectItem>
                                    <SelectItem value="select">Select (Dropdown)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="mt-8 text-destructive hover:text-destructive/90"
                        onClick={() => handleRemoveField(category, index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button variant="outline" onClick={() => handleAddField(category)} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Field
            </Button>
        </div>
    )

    if (loading) return <div>Loading settings...</div>

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Custom Fields</CardTitle>
                <CardDescription>Define custom data fields for your lab's entities.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="sample">
                    <TabsList className="mb-4">
                        <TabsTrigger value="sample">Samples</TabsTrigger>
                        <TabsTrigger value="protocol">Protocols</TabsTrigger>
                        <TabsTrigger value="experiment">Experiments</TabsTrigger>
                    </TabsList>
                    <TabsContent value="sample">
                        {renderFieldEditor('sample')}
                    </TabsContent>
                    <TabsContent value="protocol">
                        {renderFieldEditor('protocol')}
                    </TabsContent>
                    <TabsContent value="experiment">
                        {renderFieldEditor('experiment')}
                    </TabsContent>
                </Tabs>

                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
