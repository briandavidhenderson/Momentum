"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Building2,
    GraduationCap,
    BookOpen,
    Users,
    FlaskConical,
    ChevronRight,
    ChevronDown,
    Search,
    Loader2,
    Filter,
    Save,
    Trash2,
    History
} from "lucide-react"
import {
    getOrganisations,
    getInstitutes,
    getLabs,
    getResearchGroups,
    getWorkingLabs
} from "@/lib/services/hierarchyService"
import {
    Organisation,
    Institute,
    Lab,
    ResearchGroup,
    WorkingLab,
    SavedSearch
} from "@/lib/types/hierarchy.types"

export default function HierarchyExplorer() {
    const [loading, setLoading] = useState(true)
    const [organisations, setOrganisations] = useState<Organisation[]>([])
    const [institutes, setInstitutes] = useState<Institute[]>([])
    const [labs, setLabs] = useState<Lab[]>([])
    const [researchGroups, setResearchGroups] = useState<ResearchGroup[]>([])
    const [workingLabs, setWorkingLabs] = useState<WorkingLab[]>([])

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState("")

    // Advanced Filters State
    const [countryFilter, setCountryFilter] = useState("")
    const [areaFilter, setAreaFilter] = useState("")
    const [orgTypeFilter, setOrgTypeFilter] = useState("")

    // Saved Searches State
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const [newSearchName, setNewSearchName] = useState("")

    // Load saved searches from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("hierarchySavedSearches")
        if (saved) {
            try {
                setSavedSearches(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse saved searches", e)
            }
        }
    }, [])

    // Save to localStorage whenever savedSearches changes
    useEffect(() => {
        localStorage.setItem("hierarchySavedSearches", JSON.stringify(savedSearches))
    }, [savedSearches])

    const handleSaveSearch = () => {
        if (!newSearchName.trim()) return

        const newSearch: SavedSearch = {
            id: crypto.randomUUID(),
            name: newSearchName,
            criteria: {
                searchTerm,
                countryFilter,
                areaFilter,
                orgTypeFilter
            },
            createdAt: Date.now()
        }
        setSavedSearches([...savedSearches, newSearch])
        setNewSearchName("")
        setShowSaveDialog(false)
    }

    const handleLoadSearch = (search: SavedSearch) => {
        setSearchTerm(search.criteria.searchTerm)
        setCountryFilter(search.criteria.countryFilter)
        setAreaFilter(search.criteria.areaFilter)
        setOrgTypeFilter(search.criteria.orgTypeFilter || "")
    }

    const handleDeleteSearch = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setSavedSearches(savedSearches.filter(s => s.id !== id))
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [orgs, insts, depts, groups, wLabs] = await Promise.all([
                    getOrganisations(),
                    getInstitutes(),
                    getLabs(),
                    getResearchGroups(),
                    getWorkingLabs()
                ])
                setOrganisations(orgs)
                setInstitutes(insts)
                setLabs(depts)
                setResearchGroups(groups)
                setWorkingLabs(wLabs)
            } catch (error) {
                console.error("Error fetching hierarchy data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedIds(newExpanded)
    }

    // Calculate unique options for filters
    const uniqueCountries = useMemo(() => {
        const countries = new Set(organisations.map(o => o.country).filter(Boolean))
        return Array.from(countries).sort()
    }, [organisations])

    const uniqueOrgTypes = useMemo(() => {
        const types = new Set(organisations.map(o => o.type).filter(Boolean))
        return Array.from(types).sort()
    }, [organisations])

    const uniqueResearchAreas = useMemo(() => {
        const areas = new Set<string>()
        labs.forEach(l => {
            if (l.researchAreas) {
                l.researchAreas.forEach((a: string) => areas.add(a))
            }
        })
        return Array.from(areas).sort()
    }, [labs])

    // Filter logic
    const filteredData = useMemo(() => {
        if (!searchTerm && !countryFilter && !areaFilter && !orgTypeFilter) {
            return { organisations, institutes, labs, researchGroups, workingLabs }
        }

        const lowerSearch = searchTerm.toLowerCase()

        // 1. Filter Organisations by Country and Type
        let filteredOrgs = organisations
        if (countryFilter) {
            filteredOrgs = filteredOrgs.filter(o => o.country === countryFilter)
        }
        if (orgTypeFilter) {
            filteredOrgs = filteredOrgs.filter(o => o.type === orgTypeFilter)
        }

        // 2. Filter Labs by Research Area
        let filteredLabs = labs
        if (areaFilter) {
            filteredLabs = filteredLabs.filter(l => l.researchAreas?.includes(areaFilter))
        }

        // 3. Apply Search Term (if exists)
        // If a child matches, we must include its parents
        // If a parent matches, we include it (and potentially its children, but logic below focuses on inclusion)

        // Filter Working Labs
        const matchingWL = workingLabs.filter(l =>
            l.name.toLowerCase().includes(lowerSearch)
        )

        // Filter Research Groups
        const matchingRG = researchGroups.filter(g =>
            g.name.toLowerCase().includes(lowerSearch) ||
            matchingWL.some(wl => wl.researchGroupId === g.id)
        )

        // Filter Labs (combining Area filter + Search + Child matches)
        const matchingLabs = filteredLabs.filter(l =>
        (l.name.toLowerCase().includes(lowerSearch) ||
            matchingRG.some(rg => rg.departmentId === l.id))
        )

        // Filter Institutes (combining Search + Child matches)
        const matchingInsts = institutes.filter(i =>
        (i.name.toLowerCase().includes(lowerSearch) ||
            matchingLabs.some(l => l.instituteId === i.id))
        )

        // Filter Organisations (combining Country/Type filter + Search + Child matches)
        const matchingOrgs = filteredOrgs.filter(o =>
        (o.name.toLowerCase().includes(lowerSearch) ||
            matchingInsts.some(i => i.organisationId === o.id))
        )

        // Re-filter children based on parent inclusion to ensure consistency
        const finalOrgs = matchingOrgs
        const finalInsts = matchingInsts.filter(i => finalOrgs.some(o => o.id === i.organisationId))
        const finalLabs = matchingLabs.filter(l => finalInsts.some(i => i.id === l.instituteId))
        const finalRGs = matchingRG.filter(g => finalLabs.some(l => l.id === g.departmentId))
        const finalWLs = matchingWL.filter(w => finalRGs.some(g => g.id === w.researchGroupId))

        return {
            organisations: finalOrgs,
            institutes: finalInsts,
            labs: finalLabs,
            researchGroups: finalRGs,
            workingLabs: finalWLs
        }
    }, [searchTerm, countryFilter, areaFilter, orgTypeFilter, organisations, institutes, labs, researchGroups, workingLabs])

    // Auto-expand on search
    useEffect(() => {
        if (searchTerm) {
            const allIds = new Set<string>()
            filteredData.organisations.forEach(o => allIds.add(o.id))
            filteredData.institutes.forEach(i => allIds.add(i.id))
            filteredData.labs.forEach(l => allIds.add(l.id))
            filteredData.researchGroups.forEach(g => allIds.add(g.id))
            setExpandedIds(allIds)
        }
    }, [searchTerm, filteredData])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[600px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Explore Hierarchy</h2>
                        <p className="text-muted-foreground">
                            Navigate the organizational structure from University to Working Lab
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-lg border">
                    <Filter className="h-4 w-4 text-slate-500 mr-2" />
                    <span className="text-sm font-medium text-slate-700 mr-2">Filters:</span>

                    <select
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                    >
                        <option value="">All Countries</option>
                        {uniqueCountries.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <select
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={orgTypeFilter}
                        onChange={(e) => setOrgTypeFilter(e.target.value)}
                    >
                        <option value="">All Types</option>
                        {uniqueOrgTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>

                    <select
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                    >
                        <option value="">All Research Areas</option>
                        {uniqueResearchAreas.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>

                    {(countryFilter || areaFilter || orgTypeFilter || searchTerm) && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setCountryFilter("")
                                    setAreaFilter("")
                                    setOrgTypeFilter("")
                                    setSearchTerm("")
                                }}
                                className="h-9 px-2 lg:px-3"
                            >
                                Reset
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSaveDialog(true)}
                                className="h-9 gap-1"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Save
                            </Button>
                        </>
                    )}
                </div>

                {/* Saved Searches List */}
                {savedSearches.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <History className="h-3 w-3" /> Saved:
                        </span>
                        {savedSearches.map(search => (
                            <Badge
                                key={search.id}
                                variant="outline"
                                className="cursor-pointer hover:bg-slate-100 flex items-center gap-1 pr-1"
                                onClick={() => handleLoadSearch(search)}
                            >
                                {search.name}
                                <div
                                    role="button"
                                    className="p-0.5 hover:bg-slate-200 rounded-full ml-1"
                                    onClick={(e) => handleDeleteSearch(search.id, e)}
                                >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-600" />
                                </div>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid gap-4">
                {filteredData.organisations.map(org => (
                    <Card key={org.id} className="overflow-hidden border-l-4 border-l-slate-500">
                        <div
                            className="flex items-center p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleExpand(org.id)}
                        >
                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6 mr-2">
                                {expandedIds.has(org.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <Building2 className="h-5 w-5 text-slate-500 mr-3" />
                            <div className="flex-1">
                                <div className="font-semibold text-lg">{org.name}</div>
                                <div className="text-xs text-muted-foreground">{org.country} • {org.type}</div>
                            </div>
                            <Badge variant="secondary">{filteredData.institutes.filter(i => i.organisationId === org.id).length} Schools</Badge>
                        </div>

                        {expandedIds.has(org.id) && (
                            <div className="bg-slate-50/50 p-4 pt-0 pl-12 space-y-3 border-t">
                                {filteredData.institutes
                                    .filter(inst => inst.organisationId === org.id)
                                    .map(inst => (
                                        <div key={inst.id} className="border rounded-lg bg-white shadow-sm">
                                            <div
                                                className="flex items-center p-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleExpand(inst.id)
                                                }}
                                            >
                                                <Button variant="ghost" size="sm" className="p-0 h-6 w-6 mr-2">
                                                    {expandedIds.has(inst.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                                <GraduationCap className="h-4 w-4 text-blue-600 mr-3" />
                                                <div className="flex-1">
                                                    <div className="font-medium">{inst.name}</div>
                                                </div>
                                                <Badge variant="outline" className="text-xs">{filteredData.labs.filter(l => l.instituteId === inst.id).length} Depts</Badge>
                                            </div>

                                            {expandedIds.has(inst.id) && (
                                                <div className="pl-10 pr-3 pb-3 space-y-2">
                                                    {filteredData.labs
                                                        .filter(lab => lab.instituteId === inst.id)
                                                        .map(lab => (
                                                            <div key={lab.id} className="border rounded-md bg-slate-50/50">
                                                                <div
                                                                    className="flex items-center p-2 cursor-pointer hover:bg-slate-100 transition-colors rounded-md"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        toggleExpand(lab.id)
                                                                    }}
                                                                >
                                                                    <Button variant="ghost" size="sm" className="p-0 h-5 w-5 mr-2">
                                                                        {expandedIds.has(lab.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                                    </Button>
                                                                    <BookOpen className="h-4 w-4 text-emerald-600 mr-2" />
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-sm">{lab.name}</div>
                                                                    </div>
                                                                    <Badge variant="secondary" className="text-[10px] h-5">{filteredData.researchGroups.filter(g => g.departmentId === lab.id).length} Groups</Badge>
                                                                </div>

                                                                {expandedIds.has(lab.id) && (
                                                                    <div className="pl-9 pr-2 pb-2 space-y-2">
                                                                        {filteredData.researchGroups
                                                                            .filter(group => group.departmentId === lab.id)
                                                                            .map(group => (
                                                                                <div key={group.id} className="border rounded bg-white p-2">
                                                                                    <div
                                                                                        className="flex items-center cursor-pointer"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            toggleExpand(group.id)
                                                                                        }}
                                                                                    >
                                                                                        <Button variant="ghost" size="sm" className="p-0 h-4 w-4 mr-2">
                                                                                            {expandedIds.has(group.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                                                        </Button>
                                                                                        <Users className="h-3.5 w-3.5 text-violet-600 mr-2" />
                                                                                        <div className="flex-1">
                                                                                            <div className="font-medium text-sm">{group.name}</div>
                                                                                            {group.description && <div className="text-xs text-muted-foreground line-clamp-1">{group.description}</div>}
                                                                                        </div>
                                                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                                            <Users className="h-3 w-3" /> {group.memberCount || 0}
                                                                                        </div>
                                                                                    </div>

                                                                                    {expandedIds.has(group.id) && (
                                                                                        <div className="mt-2 pl-6 space-y-1">
                                                                                            {filteredData.workingLabs
                                                                                                .filter(wl => wl.researchGroupId === group.id)
                                                                                                .map(wl => (
                                                                                                    <div key={wl.id} className="flex items-center p-1.5 rounded hover:bg-slate-50 text-sm">
                                                                                                        <FlaskConical className="h-3 w-3 text-amber-600 mr-2" />
                                                                                                        <span className="text-slate-700">{wl.name}</span>
                                                                                                        {wl.building && <span className="text-xs text-muted-foreground ml-2">({wl.building})</span>}
                                                                                                    </div>
                                                                                                ))}
                                                                                            {filteredData.workingLabs.filter(wl => wl.researchGroupId === group.id).length === 0 && (
                                                                                                <div className="text-xs text-muted-foreground italic pl-2">No working labs</div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        {filteredData.researchGroups.filter(g => g.departmentId === lab.id).length === 0 && (
                                                                            <div className="text-xs text-muted-foreground italic pl-2">No research groups</div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Current Search</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Search Name</Label>
                            <Input
                                placeholder="e.g., UK Biology Depts"
                                value={newSearchName}
                                onChange={(e) => setNewSearchName(e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <p>Saving filters:</p>
                            <ul className="list-disc list-inside mt-1">
                                {countryFilter && <li>Country: {countryFilter}</li>}
                                {areaFilter && <li>Area: {areaFilter}</li>}
                                {searchTerm && <li>Term: {searchTerm}</li>}
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveSearch} disabled={!newSearchName.trim()}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
