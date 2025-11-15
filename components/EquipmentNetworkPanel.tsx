"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { EquipmentDevice, InventoryItem, Order, PersonProfile, MasterProject, EquipmentSupply } from "@/lib/types"
import { calculateMaintenanceHealth, supplyHealthForDevice, supplyHealthPercent, getHealthColor, getHealthClass, formatCurrency } from "@/lib/equipmentMath"
import { EQUIPMENT_CONFIG } from "@/lib/equipmentConfig"
import { enrichSupply, enrichDeviceSupplies, EnrichedSupply } from "@/lib/supplyUtils"
import { notifyLowStock, notifyCriticalStock, getLabManagers } from "@/lib/notificationUtils"
import { CheckStockDialog } from "@/components/dialogs/CheckStockDialog"
import { Network, Wrench, ShoppingCart, AlertCircle, ZoomIn, ZoomOut, Crosshair, Package, Plus } from "lucide-react"

// Simple Switch component
const Switch = ({ id, checked, onCheckedChange }: { id?: string; checked: boolean; onCheckedChange: (v: boolean) => void }) => (
  <label htmlFor={id} className="inline-flex cursor-pointer select-none items-center gap-2">
    <span className={`h-5 w-9 rounded-full transition ${checked ? "bg-brand-500" : "bg-gray-300"}`}>
      <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </span>
    <input id={id} type="checkbox" className="hidden" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
  </label>
)

// Toast replacement
const toast = {
  success: (msg: string) => alert(msg),
  error: (msg: string) => alert(msg),
}

// Lab reference type
interface LabRef {
  id: string
  name: string
  color?: string
}

// Graph types
type NodeType = "lab" | "device" | "supply"

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  type: NodeType
  labId?: string
  deviceId?: string
  color: string
  payload?: any
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  type: "hosts" | "uses"
}

interface EquipmentNetworkPanelProps {
  equipment: EquipmentDevice[]
  inventory: InventoryItem[]
  orders: Order[]
  masterProjects: MasterProject[]
  currentUserProfile: PersonProfile | null
  allProfiles: PersonProfile[] // For notification recipients
  onEquipmentUpdate: (equipmentId: string, updates: Partial<EquipmentDevice>) => void
  onInventoryUpdate: (inventory: InventoryItem[]) => void
  onOrderCreate: (order: Omit<Order, "id">) => void
  onInventoryCreate: (item: Omit<InventoryItem, "id">) => void
}

export function EquipmentNetworkPanel({
  equipment = [],
  inventory = [],
  orders = [],
  masterProjects = [],
  currentUserProfile,
  allProfiles,
  onEquipmentUpdate,
  onInventoryUpdate,
  onOrderCreate,
  onInventoryCreate,
}: EquipmentNetworkPanelProps) {
  // Extract unique labs from equipment
  const labs: LabRef[] = useMemo(() => {
    const labMap = new Map<string, LabRef>()
    equipment.forEach(dev => {
      if (dev.labId && !labMap.has(dev.labId)) {
        labMap.set(dev.labId, {
          id: dev.labId,
          name: dev.labId, // Could be enhanced with actual lab names
          color: "#0ea5e9"
        })
      }
    })
    return Array.from(labMap.values())
  }, [equipment])

  const [searchTerm, setSearchTerm] = useState("")
  const [forceStrength, setForceStrength] = useState(-280)
  const [showHulls, setShowHulls] = useState(true)
  const [showSupplies, setShowSupplies] = useState(true)
  const [edgeLayers, setEdgeLayers] = useState({ hosts: true, uses: true })

  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [checkStockSupply, setCheckStockSupply] = useState<EnrichedSupply | null>(null)

  const [addingSupply, setAddingSupply] = useState<string | null>(null) // deviceId when adding supply
  const [newSupplyForm, setNewSupplyForm] = useState({
    inventoryItemId: "",
    name: "",
    qty: "0",
    minQty: "1",
    burnPerWeek: "0.5",
    price: "0"
  })

  const svgRef = useRef<SVGSVGElement>(null)

  // Build graph nodes and links
  const { nodes, links, counts } = useMemo(() => {
    const N: GraphNode[] = []
    const L: GraphLink[] = []

    // Add lab nodes
    labs.forEach(l => {
      N.push({
        id: `lab:${l.id}`,
        name: l.name,
        type: "lab",
        labId: l.id,
        color: l.color || "#0ea5e9"
      })
    })

    // Add device and supply nodes
    equipment.forEach(dev => {
      if (!dev.id) return

      const labId = dev.labId || labs[0]?.id || "unknown-lab"
      const maint = calculateMaintenanceHealth(dev.lastMaintained, dev.maintenanceDays)
      const supHealth = supplyHealthForDevice(dev)
      const overall = Math.min(maint, supHealth)

      const deviceNode: GraphNode = {
        id: `dev:${dev.id}`,
        name: dev.name,
        type: "device",
        labId,
        color: getHealthColor(overall),
        payload: dev,
      }
      N.push(deviceNode)
      L.push({ source: `lab:${labId}`, target: deviceNode.id, type: "hosts" })

      // Add supply nodes if enabled
      if (showSupplies && dev.supplies?.length) {
        const enrichedSupplies = enrichDeviceSupplies(dev, inventory)
        enrichedSupplies.forEach(s => {
          const supplyNode: GraphNode = {
            id: `sup:${dev.id}:${s.id}`,
            name: s.name, // From enriched supply (joined with inventory)
            type: "supply",
            labId,
            deviceId: dev.id,
            color: getHealthColor(s.healthPercent),
            payload: { device: dev, supply: s },
          }
          N.push(supplyNode)
          L.push({ source: deviceNode.id, target: supplyNode.id, type: "uses" })
        })
      }
    })

    return {
      nodes: N,
      links: L,
      counts: {
        labs: N.filter(n => n.type === "lab").length,
        devices: N.filter(n => n.type === "device").length,
        supplies: N.filter(n => n.type === "supply").length,
      }
    }
  }, [equipment, labs, showSupplies, inventory])

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const width = 1400, height = 900
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")

    svg.selectAll("*").remove()

    const gRoot = svg.append("g")
    const gHulls = gRoot.append("g")
    const gLinks = gRoot.append("g")
    const gNodes = gRoot.append("g")

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2.5])
      .on("zoom", (ev) => { gRoot.attr("transform", ev.transform) })
    svg.call(zoom as any)

    // Calculate lab centers
    const labNodes = nodes.filter(n => n.type === "lab")
    const center = { x: width / 2, y: height / 2 }
    const labCenters: Record<string, { x: number; y: number }> = {}
    labNodes.forEach((ln, i) => {
      const angle = (i / Math.max(1, labNodes.length)) * Math.PI * 2
      labCenters[ln.labId || "unknown-lab"] = {
        x: center.x + Math.cos(angle) * 350,
        y: center.y + Math.sin(angle) * 280,
      }
    })

    // Force simulation
    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(l => l.type === "hosts" ? 140 : 80)
        .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(forceStrength))
      .force("collide", d3.forceCollide<GraphNode>().radius(d =>
        d.type === "lab" ? 30 : d.type === "device" ? 22 : 12
      ))
      .force("x", d3.forceX<GraphNode>(d => {
        const c = d.labId && labCenters[d.labId]
        return c ? c.x : center.x
      }).strength(0.12))
      .force("y", d3.forceY<GraphNode>(d => {
        const c = d.labId && labCenters[d.labId]
        return c ? c.y : center.y
      }).strength(0.12))

    // Links
    const link = gLinks.selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: GraphLink) => d.type === "hosts" ? "#94a3b8" : "#60a5fa")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7)
      .style("display", (d: GraphLink) => edgeLayers[d.type] ? null : "none")

    // Nodes
    const node = gNodes.selectAll("g.node")
      .data(nodes, (d: any) => d.id)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .on("click", (_, d: GraphNode) => setSelected(d))
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on("start", (ev, d) => {
            if (!ev.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (ev, d) => {
            d.fx = ev.x
            d.fy = ev.y
          })
          .on("end", (ev, d) => {
            if (!ev.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null
          }) as any
      )

    const radius = (d: GraphNode) => d.type === "lab" ? 16 : d.type === "device" ? 12 : 6

    node.append("circle")
      .attr("r", radius as any)
      .attr("fill", (d: GraphNode) => d.color)
      .attr("stroke", (d: GraphNode) => d.type === "lab" ? "#1e293b" : "none")
      .attr("stroke-width", (d: GraphNode) => d.type === "lab" ? 3 : 0)

    node.append("text")
      .attr("x", 16)
      .attr("y", 5)
      .attr("font-size", 12)
      .attr("fill", "#1f2937")
      .text((d: GraphNode) => d.name)

    // Search filter
    function applySearch() {
      const q = searchTerm.trim().toLowerCase()
      const match = (n: GraphNode) => q === "" || n.name.toLowerCase().includes(q)
      node.selectAll<SVGCircleElement, GraphNode>("circle").attr("opacity", (d) => match(d) ? 1 : 0.25)
      node.selectAll<SVGTextElement, GraphNode>("text").attr("opacity", (d) => match(d) ? 1 : 0.2)
    }

    // Lab hulls
    function drawHulls() {
      const hullData = labNodes.map(l => {
        const pts = nodes.filter(n => n.labId === l.labId && n.type !== "lab")
          .map(n => [n.x as number, n.y as number] as [number, number])
        if (pts.length < 3) return null
        const path = d3.polygonHull(pts)
        return path ? { id: l.labId!, label: l.name, path } : null
      }).filter(Boolean) as any[]

      gHulls.selectAll("path.lab-hull")
        .data(hullData, (d: any) => d.id)
        .join("path")
        .attr("class", "lab-hull")
        .attr("fill", "none")
        .attr("stroke", "#60a5fa")
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", 2.5)
        .style("display", showHulls ? "" : "none")
        .attr("d", (d: any) => `M${d.path.join('L')}Z`)

      gHulls.selectAll("text.lab-label")
        .data(hullData, (d: any) => d.id)
        .join("text")
        .attr("class", "lab-label")
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .attr("font-weight", 800)
        .attr("fill", "#0f172a")
        .style("display", showHulls ? "" : "none")
        .text((d: any) => d.label)
        .attr("x", (d: any) => d3.polygonCentroid(d.path)[0])
        .attr("y", (d: any) => d3.polygonCentroid(d.path)[1])
    }

    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as GraphNode).x!)
        .attr("y1", (d: any) => (d.source as GraphNode).y!)
        .attr("x2", (d: any) => (d.target as GraphNode).x!)
        .attr("y2", (d: any) => (d.target as GraphNode).y!)

      node.attr("transform", (d: GraphNode) => `translate(${d.x},${d.y})`)
      applySearch()
      drawHulls()
    })

    return () => { sim.stop() }
  }, [nodes, links, searchTerm, forceStrength, edgeLayers, showHulls])

  // Actions
  const handlePerformMaintenance = (deviceId: string) => {
    const today = new Date().toISOString().slice(0, 10)
    onEquipmentUpdate(deviceId, { lastMaintained: today })
    toast.success("Maintenance recorded")
  }

  const handleReorder = (dev: EquipmentDevice, s: EnrichedSupply) => {
    // Find most recent prior order using enriched supply data
    const priorOrders = orders.filter(o =>
      (o.sourceSupplyId === s.id) ||
      (o.sourceInventoryItemId === s.inventoryItemId) ||
      (o.sourceDeviceId === dev.id && o.productName === s.name)
    ).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())

    const prior = priorOrders[0]

    const newOrder: Omit<Order, "id"> = {
      productName: s.name, // From enriched supply (joined with inventory)
      catNum: s.catNum || prior?.catNum || "",
      supplier: s.supplier || prior?.supplier || "",
      accountId: prior?.accountId || "",
      accountName: prior?.accountName || "Select Account",
      funderId: prior?.funderId || "",
      funderName: prior?.funderName || "Select Funder",
      masterProjectId: prior?.masterProjectId || "",
      masterProjectName: prior?.masterProjectName || "Select Project",
      priceExVAT: s.price, // From enriched supply (joined with inventory)
      currency: prior?.currency || EQUIPMENT_CONFIG.currency.code,
      status: "to-order",
      orderedBy: currentUserProfile?.id || "",
      createdBy: currentUserProfile?.id || "",
      createdDate: new Date(),
      category: prior?.category,
      subcategory: prior?.subcategory,
      sourceDeviceId: dev.id,
      sourceSupplyId: s.id,
      sourceInventoryItemId: s.inventoryItemId,
    }

    onOrderCreate(newOrder)
    toast.success("Order added to Orders tab")
  }

  const handleAddSupply = (deviceId: string) => {
    setAddingSupply(deviceId)
    setNewSupplyForm({
      inventoryItemId: "",
      name: "",
      qty: "0",
      minQty: "1",
      burnPerWeek: "0.5",
      price: "0"
    })
  }

  const handleSaveNewSupply = () => {
    if (!addingSupply) return

    const device = equipment.find(d => d.id === addingSupply)
    if (!device) return

    // inventoryItemId is now REQUIRED - must select from existing inventory
    if (!newSupplyForm.inventoryItemId) {
      toast.error("Please select an inventory item or create a new reagent first")
      return
    }

    const invItem = inventory.find(i => i.id === newSupplyForm.inventoryItemId)
    if (!invItem) {
      toast.error("Selected inventory item not found")
      return
    }

    // Create supply with only device-specific settings (no name/qty/price duplication)
    const newSupply: EquipmentSupply = {
      id: `sup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      inventoryItemId: invItem.id, // REQUIRED link to inventory
      minQty: parseFloat(newSupplyForm.minQty) || 1,
      burnPerWeek: parseFloat(newSupplyForm.burnPerWeek) || 0.5,
      // chargeToAccountId and chargeToProjectId can be added later if needed
    }

    const updatedSupplies = [...(device.supplies || []), newSupply]
    onEquipmentUpdate(device.id, { supplies: updatedSupplies })

    setAddingSupply(null)
    toast.success(`Added ${invItem.productName} to ${device.name}`)
  }

  const handleCreateReagent = () => {
    if (!newSupplyForm.name.trim()) {
      toast.error("Please enter a reagent name")
      return
    }

    // Create inventory item with 0 stock (required fields: currentQuantity, priceExVAT)
    const newInventoryItem: Omit<InventoryItem, "id"> = {
      productName: newSupplyForm.name,
      catNum: "",
      supplier: "",
      currentQuantity: 0, // REQUIRED: Start with 0 stock
      priceExVAT: parseFloat(newSupplyForm.price) || 0, // REQUIRED: Price from form
      minQuantity: parseInt(newSupplyForm.minQty) || 1,
      inventoryLevel: "empty",
      receivedDate: new Date(),
      lastOrderedDate: undefined,
      chargeToAccount: "",
      category: "Reagent",
      subcategory: "Lab Supply",
      notes: "Created from Equipment Network",
    }

    onInventoryCreate(newInventoryItem)
    toast.success(`Created reagent: ${newSupplyForm.name}. Add to order from Orders tab.`)
  }

  return (
    <div className="card-monday p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Network className="h-6 w-6 text-brand-500" />
            Equipment & Reagents Network
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visual overview of all equipment, supplies, and their health status across labs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Controls Panel */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Controls</h3>

          {/* Search */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Search</Label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name..."
              className="h-8 text-sm"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Visibility</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="hulls" className="text-sm">Lab Hulls</Label>
              <Switch id="hulls" checked={showHulls} onCheckedChange={setShowHulls} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="supplies" className="text-sm">Show Supplies</Label>
              <Switch id="supplies" checked={showSupplies} onCheckedChange={setShowSupplies} />
            </div>
          </div>

          {/* Edge Layers */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Edge Layers</Label>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Lab → Device</Label>
              <Switch
                checked={edgeLayers.hosts}
                onCheckedChange={(v) => setEdgeLayers({ ...edgeLayers, hosts: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Device → Supply</Label>
              <Switch
                checked={edgeLayers.uses}
                onCheckedChange={(v) => setEdgeLayers({ ...edgeLayers, uses: v })}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="pt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
            <div>🏢 {counts.labs} labs</div>
            <div>🔧 {counts.devices} devices</div>
            <div>📦 {counts.supplies} supplies</div>
          </div>
        </div>

        {/* Graph + Details */}
        <div className="space-y-4">
          {/* Graph */}
          <div className="rounded-xl border border-border bg-card overflow-hidden"
            style={{
              background: "radial-gradient(1200px 700px at 60% -20%, rgba(59, 130, 246, 0.06), transparent 60%), radial-gradient(900px 600px at -10% 120%, rgba(6, 182, 212, 0.06), transparent 60%), #ffffff"
            }}
          >
            <svg ref={svgRef} className="w-full" style={{ height: "60vh" }} />
          </div>

          {/* Details Panel */}
          {selected && (
            <div className="rounded-xl border border-border bg-card p-4">
              {selected.type === "device" && (() => {
                const dev: EquipmentDevice = selected.payload
                const mh = calculateMaintenanceHealth(dev.lastMaintained, dev.maintenanceDays)
                const sh = supplyHealthForDevice(dev)
                const mClass = getHealthClass(mh)
                const sClass = getHealthClass(sh)

                return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        {dev.name}
                      </h3>
                      <div className="text-xs text-muted-foreground">{dev.type || "Device"}</div>
                    </div>

                    {/* Health Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Maintenance</span>
                          <Badge variant={mClass === 'critical' ? 'destructive' : 'outline'}>
                            {mh}%
                          </Badge>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${mClass === 'critical' ? 'bg-red-500' : mClass === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{ width: `${mh}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Supplies</span>
                          <Badge variant={sClass === 'critical' ? 'destructive' : 'outline'}>
                            {sh}%
                          </Badge>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${sClass === 'critical' ? 'bg-red-500' : sClass === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{ width: `${sh}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePerformMaintenance(dev.id)}
                      className="w-full"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Perform Maintenance
                    </Button>

                    {/* Supplies List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">Reagents & Consumables</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddSupply(dev.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {enrichDeviceSupplies(dev, inventory).map(s => {
                          const cls = getHealthClass(s.healthPercent)
                          return (
                            <div key={s.id} className="rounded border border-border bg-muted/30 p-2 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                  {s.healthPercent <= 25 && <AlertCircle className="h-3 w-3 text-red-500" />}
                                  <span className="font-medium">{s.name}</span>
                                </div>
                                <div className="flex gap-1">
                                  {s.currentQuantity === 0 ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2"
                                      onClick={() => handleReorder(dev, s)}
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      Reorder
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2"
                                      onClick={() => setCheckStockSupply(s)}
                                    >
                                      Check
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Qty: {s.currentQuantity}/{s.minQty} • Burn: {s.burnPerWeek}/wk
                              </div>
                              <div className="h-1 w-full rounded bg-muted mt-1">
                                <div
                                  className={`h-full rounded ${cls === 'critical' ? 'bg-red-500' : cls === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}
                                  style={{ width: `${s.healthPercent}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {selected.type === "supply" && (() => {
                const dev: EquipmentDevice = selected.payload.device
                const s: EnrichedSupply = selected.payload.supply // Already enriched in graph nodes
                const cls = getHealthClass(s.healthPercent)

                return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {s.name}
                      </h3>
                      <div className="text-xs text-muted-foreground">Used by {dev.name}</div>
                    </div>

                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${cls === 'critical' ? 'bg-red-500' : cls === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}
                        style={{ width: `${s.healthPercent}%` }}
                      />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Qty: {s.currentQuantity}/{s.minQty} • Burn: {s.burnPerWeek}/wk • Price: {formatCurrency(s.price)}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReorder(dev, s)}
                        className="flex-1"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Orders
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCheckStockSupply(s)}
                      >
                        Update Stock
                      </Button>
                    </div>
                  </div>
                )
              })()}

              {selected.type === "lab" && (
                <div className="text-sm text-muted-foreground">
                  <strong>{selected.name}</strong> - Click devices and supplies to view details.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Check Stock Dialog - Using Shared Component */}
      <CheckStockDialog
        open={!!checkStockSupply}
        onClose={() => setCheckStockSupply(null)}
        supply={checkStockSupply}
        inventory={inventory}
        allProfiles={allProfiles}
        onInventoryUpdate={onInventoryUpdate}
      />

      {/* Add Supply Dialog */}
      <Dialog open={!!addingSupply} onOpenChange={() => setAddingSupply(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Reagent/Consumable</DialogTitle>
            <DialogDescription>
              Select from existing inventory or create a new reagent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inventory-select">Select from Inventory</Label>
              <select
                id="inventory-select"
                value={newSupplyForm.inventoryItemId}
                onChange={(e) => {
                  const value = e.target.value
                  const item = inventory.find(i => i.id === value)
                  if (item) {
                    setNewSupplyForm({
                      ...newSupplyForm,
                      inventoryItemId: value,
                      name: item.productName,
                      price: String(item.priceExVAT || 0),
                      minQty: String(item.minQuantity || 1),
                    })
                  } else {
                    setNewSupplyForm({ ...newSupplyForm, inventoryItemId: value })
                  }
                }}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Choose an inventory item...</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.productName} {item.catNum && `(${item.catNum})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or Create New
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="supply-name">Reagent Name *</Label>
                <Input
                  id="supply-name"
                  value={newSupplyForm.name}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, name: e.target.value })}
                  placeholder="e.g., Taq Master Mix"
                  disabled={!!newSupplyForm.inventoryItemId}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="supply-qty">Current Qty</Label>
                <Input
                  id="supply-qty"
                  type="number"
                  min={0}
                  value={newSupplyForm.qty}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, qty: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="supply-min">Min Qty</Label>
                <Input
                  id="supply-min"
                  type="number"
                  min={0}
                  value={newSupplyForm.minQty}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, minQty: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="supply-burn">Burn Rate (per week)</Label>
                <Input
                  id="supply-burn"
                  type="number"
                  min={0}
                  step={0.1}
                  value={newSupplyForm.burnPerWeek}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, burnPerWeek: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="supply-price">Unit Price</Label>
                <Input
                  id="supply-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={newSupplyForm.price}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, price: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={handleCreateReagent}
                disabled={!newSupplyForm.name.trim() || !!newSupplyForm.inventoryItemId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Reagent (0 stock)
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAddingSupply(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNewSupply}>
                  Add to Device
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
