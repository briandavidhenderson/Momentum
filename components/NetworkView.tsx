"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { useProfiles } from "@/lib/useProfiles"
import { FUNDING_ACCOUNTS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  role: string
  lab: string
  organisation?: string
  institute?: string
  employer?: string
  funders: string[]
  _hidden?: boolean
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  type: 'supervises' | 'collaborates_with' | 'belongs_to'
}

interface Organisation {
  id: string
  label: string
  color: string
}

interface Institute {
  id: string
  label: string
  organisation: string
  color: string
}

interface Lab {
  id: string
  label: string
  institute: string
  organisation: string
}

export function NetworkView() {
  const profiles = useProfiles()
  const svgRef = useRef<SVGSVGElement>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [forceStrength, setForceStrength] = useState(-280)
  const [showBackgrounds, setShowBackgrounds] = useState("both")
  const [edgeLayers, setEdgeLayers] = useState({
    supervises: true,
    collaborates_with: true,
    belongs_to: false,
  })

  useEffect(() => {
    if (!svgRef.current) return

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove()

    // Define hierarchy from profiles: Organisation -> Institute -> Lab -> People
    const uniqueOrganisations = Array.from(new Set(profiles.map(p => p.organisation)))
    const uniqueInstitutes = Array.from(new Set(profiles.map(p => p.institute)))
    const uniqueLabs = Array.from(new Set(profiles.map(p => p.lab)))
    
    // Create organisations
    const organisations: Organisation[] = uniqueOrganisations.map((org, idx) => ({
      id: org.replace(/\s+/g, '_'),
      label: org,
      color: d3.schemeCategory10[idx % d3.schemeCategory10.length]
    }))

    // Create institutes (grouped by organisation)
    const institutes: Institute[] = uniqueInstitutes.map((inst, idx) => {
      const profile = profiles.find(p => p.institute === inst)!
      const orgId = profile.organisation.replace(/\s+/g, '_')
      const org = organisations.find(o => o.id === orgId)
      return {
        id: inst.replace(/\s+/g, '_'),
        label: inst,
        organisation: orgId,
        color: org ? org.color : d3.schemeSet2[idx % d3.schemeSet2.length]
      }
    })

    // Create labs (grouped by institute)
    const labs: Lab[] = uniqueLabs.map(lab => {
      const profile = profiles.find(p => p.lab === lab)!
      return {
        id: lab.replace(/\s+/g, '_'),
        label: lab,
        institute: profile.institute.replace(/\s+/g, '_'),
        organisation: profile.organisation.replace(/\s+/g, '_')
      }
    })

    // Create nodes from profiles
    const pis = profiles.filter(p => p.reportsTo === null)
    const allPeople: NetworkNode[] = profiles.map(p => ({
      id: p.id,
      label: `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`,
      role: p.position.includes("PhD") ? "PhD" : 
            p.position.includes("Postdoc") ? "Postdoc" :
            p.position.includes("Research Assistant") || p.position.includes("Technician") ? "RA" :
            p.position.includes("Principal") || p.position.includes("Lecturer") ? "PI" :
            p.position.includes("Manager") ? "Manager" : "Other",
      lab: p.lab.replace(/\s+/g, '_'),
      employer: p.reportsTo || p.id,
      funders: p.fundedBy.map(f => {
        const account = FUNDING_ACCOUNTS.find(a => a.name === f)
        return account ? account.name : f
      }),
      organisation: p.organisation.replace(/\s+/g, '_'),
      institute: p.institute.replace(/\s+/g, '_')
    }))

    // Hidden lab nodes for hulls
    const labNodes: NetworkNode[] = labs.map(l => ({
      id: l.id,
      label: l.label,
      role: 'Lab',
      lab: l.id,
      funders: [],
      _hidden: true
    }))

    const nodes = [...allPeople, ...labNodes]

    // Create links
    const links: NetworkLink[] = []

    // Supervision links
    profiles.forEach(p => {
      if (p.reportsTo) {
        links.push({
          source: p.reportsTo,
          target: p.id,
          type: 'supervises'
        })
      }
    })

    // Belongs to lab links
    allPeople.forEach(p => {
      links.push({
        source: p.lab,
        target: p.id,
        type: 'belongs_to'
      })
    })

    // Collaboration links (people in same lab)
    const labGroups = d3.group(allPeople, d => d.lab)
    labGroups.forEach(members => {
      for (let i = 0; i < members.length - 1; i++) {
        for (let j = i + 1; j < members.length; j++) {
          links.push({
            source: members[i].id,
            target: members[j].id,
            type: 'collaborates_with'
          })
        }
      }
    })

    // Setup SVG
    const width = 1400
    const height = 900
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")

    const gInst = svg.append("g")
    const gLab = svg.append("g")
    const gLinks = svg.append("g")
    const gNodes = svg.append("g")
    const gLabLabels = svg.append("g")

    // Color scales
    const employerColors = Object.fromEntries(
      pis.map((p, i) => [p.id, d3.schemeSet2[i % d3.schemeSet2.length]])
    )

    const funderColors: Record<string, string> = {
      "CLuB": "#22c55e",
      "BCR": "#06b6d4",
      "Deans": "#eab308",
      "Account_4": "#f97316"
    }

    const roleFallback: Record<string, string> = {
      PI: "#ff7f50",
      Postdoc: "#ffd36a",
      PhD: "#6ad1ff",
      RA: "#7cffb7",
      Manager: "#c39bff",
      Other: "#ddd"
    }

    const fillFor = (d: NetworkNode) => employerColors[d.employer || ""] || roleFallback[d.role] || "#ddd"

    // Position centers for organisations (top level)
    const orgCenters: Record<string, { x: number; y: number }> = {}
    organisations.forEach((org, i) => {
      const angle = (i / organisations.length) * 2 * Math.PI
      orgCenters[org.id] = {
        x: width / 2 + Math.cos(angle) * 350,
        y: height / 2 + Math.sin(angle) * 280
      }
    })

    // Position centers for institutes (within organisations)
    const instCenters: Record<string, { x: number; y: number }> = {}
    institutes.forEach((inst, i) => {
      const orgCenter = orgCenters[inst.organisation]
      if (orgCenter) {
        // Position institutes around their organisation center
        const instsInOrg = institutes.filter(inst2 => inst2.organisation === inst.organisation)
        const idxInOrg = instsInOrg.findIndex(inst2 => inst2.id === inst.id)
        const angle = (idxInOrg / instsInOrg.length) * 2 * Math.PI
        instCenters[inst.id] = {
          x: orgCenter.x + Math.cos(angle) * 200,
          y: orgCenter.y + Math.sin(angle) * 150
        }
      }
    })

    // Initial positions - people clustered around their institute centers
    nodes.forEach(n => {
      if (n.role === 'Lab') return
      const labData = labs.find(l => l.id === n.lab)
      if (labData && n.institute) {
        const center = instCenters[n.institute]
        if (center) {
          n.x = center.x + (Math.random() - 0.5) * 100
          n.y = center.y + (Math.random() - 0.5) * 100
        }
      }
    })

    // Force simulation
    const simulation = d3.forceSimulation<NetworkNode>(nodes)
      .force("link", d3.forceLink<NetworkNode, NetworkLink>(links)
        .id(d => d.id)
        .distance(l => l.type === 'supervises' ? 110 : l.type === 'collaborates_with' ? 150 : 80)
        .strength(0.6))
      .force("charge", d3.forceManyBody().strength(forceStrength))
      .force("collide", d3.forceCollide<NetworkNode>().radius(d => d.role === 'Lab' ? 30 : 22))
      .force("x", d3.forceX<NetworkNode>(d => {
        if (d.institute && instCenters[d.institute]) {
          return instCenters[d.institute].x
        }
        return width / 2
      }).strength(0.1))
      .force("y", d3.forceY<NetworkNode>(d => {
        if (d.institute && instCenters[d.institute]) {
          return instCenters[d.institute].y
        }
        return height / 2
      }).strength(0.1))

    // Draw organisation backgrounds (top level)
    function drawOrganisations() {
      const pad = 80
      const groups = organisations.map(org => {
        const members = nodes.filter(n => {
          if (n.role === 'Lab' || !n.organisation) return false
          return n.organisation === org.id
        })
        if (!members.length) return null
        const xs = members.map(m => m.x!)
        const ys = members.map(m => m.y!)
        return {
          org,
          x: Math.min(...xs) - pad,
          y: Math.min(...ys) - pad,
          w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
          h: Math.max(...ys) - Math.min(...ys) + 2 * pad
        }
      }).filter(Boolean) as any[]

      const orgGroups = gInst.selectAll("g.org")
        .data(groups, (d: any) => d.org.id)
        .join(enter => {
          const g = enter.append("g").attr("class", "org")
          g.append("rect")
            .attr("rx", 28)
            .attr("class", "org-bg")
            .attr("fill", (d: any) => d.org.color)
            .attr("fill-opacity", 0.08)
            .attr("stroke", (d: any) => d.org.color)
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 3)
          g.append("text")
            .attr("fill", "#1e40af")
            .attr("font-size", 22)
            .attr("font-weight", 900)
            .attr("text-anchor", "middle")
            .text((d: any) => d.org.label)
          return g
        }, update => update, exit => exit.remove())

      orgGroups.select("rect")
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y)
        .attr("width", (d: any) => d.w)
        .attr("height", (d: any) => d.h)

      orgGroups.select("text")
        .attr("x", (d: any) => d.x + d.w / 2)
        .attr("y", (d: any) => d.y + 32)
    }

    // Draw institute backgrounds (within organisations)
    function drawInstitutes() {
      const pad = 60
      const groups = institutes.map(inst => {
        const members = nodes.filter(n => {
          if (n.role === 'Lab' || !n.institute) return false
          return n.institute === inst.id
        })
        if (!members.length) return null
        const xs = members.map(m => m.x!)
        const ys = members.map(m => m.y!)
        return {
          inst,
          x: Math.min(...xs) - pad,
          y: Math.min(...ys) - pad,
          w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
          h: Math.max(...ys) - Math.min(...ys) + 2 * pad
        }
      }).filter(Boolean) as any[]

      const instGroups = gInst.selectAll("g.inst")
        .data(groups, (d: any) => d.inst.id)
        .join(enter => {
          const g = enter.append("g").attr("class", "inst")
          g.append("rect")
            .attr("rx", 24)
            .attr("class", "inst-bg")
            .attr("fill", (d: any) => d.inst.color)
            .attr("fill-opacity", 0.12)
            .attr("stroke", (d: any) => d.inst.color)
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", 3)
          g.append("text")
            .attr("fill", "#3b82f6")
            .attr("font-size", 18)
            .attr("font-weight", 900)
            .attr("text-anchor", "middle")
            .style("paint-order", "stroke")
            .style("stroke", "#0f172a")
            .style("stroke-width", "6px")
            .style("stroke-linejoin", "round")
            .text((d: any) => d.inst.label)
          return g
        })

      instGroups.select("rect")
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y)
        .attr("width", (d: any) => d.w)
        .attr("height", (d: any) => d.h)

      instGroups.select("text")
        .attr("x", (d: any) => d.x + d.w / 2)
        .attr("y", (d: any) => d.y - 12)
    }

    // Draw lab hulls
    function drawLabHulls() {
      const hullData = labs.map(l => {
        const pts = nodes.filter(n => !n._hidden && n.lab === l.id).map(n => [n.x!, n.y!] as [number, number])
        if (pts.length < 3) return null
        const path = d3.polygonHull(pts)
        return path ? { id: l.id, label: l.label, path } : null
      }).filter(Boolean) as any[]

      gLab.selectAll("path.lab-hull")
        .data(hullData, (d: any) => d.id)
        .join("path")
        .attr("class", "lab-hull")
        .attr("fill", "none")
        .attr("stroke", "#60a5fa")
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", 2.5)
        .attr("d", (d: any) => `M${d.path.join('L')}Z`)

      gLabLabels.selectAll("text.lab-label")
        .data(hullData, (d: any) => d.id)
        .join("text")
        .attr("class", "lab-label")
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .attr("font-weight", 800)
        .attr("fill", "#dbeafe")
        .style("paint-order", "stroke")
        .style("stroke", "#0f172a")
        .style("stroke-width", "6px")
        .style("stroke-linejoin", "round")
        .text((d: any) => d.label)
        .attr("x", (d: any) => d3.polygonCentroid(d.path)[0])
        .attr("y", (d: any) => d3.polygonCentroid(d.path)[1])
    }

    // Draw links
    const link = gLinks.selectAll("line")
      .data(links)
      .join("line")
      .attr("class", (d: NetworkLink) => `link ${d.type}`)
      .attr("stroke", (d: NetworkLink) => 
        d.type === 'supervises' ? '#ffb86a' :
        d.type === 'collaborates_with' ? '#ff6ad5' : '#6ad1ff')
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2.2)
      .style("display", (d: NetworkLink) => edgeLayers[d.type] ? null : "none")

    // Draw nodes
    const visibleNodes = nodes.filter(n => !n._hidden)
    const node = gNodes.selectAll("g.node")
      .data(visibleNodes, (d: any) => d.id)
      .join("g")
      .attr("class", "node")
      .call(d3.drag<SVGGElement, NetworkNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on("drag", (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }) as any)

    const R = 18

    // Main circle (employer color)
    node.append("circle")
      .attr("r", R)
      .attr("fill", (d: NetworkNode) => fillFor(d))
      .attr("stroke", (d: NetworkNode) => d.funders[0] ? funderColors[d.funders[0]] || "#1e293b" : "#1e293b")
      .attr("stroke-width", 3)

    // Second funder ring
    node.append("circle")
      .attr("r", R + 4)
      .attr("fill", "none")
      .attr("stroke", (d: NetworkNode) => d.funders[1] ? funderColors[d.funders[1]] || "transparent" : "transparent")
      .attr("stroke-width", 3)

    // Ticks for additional funders
    node.each(function(d) {
      if (d.funders.length <= 2) return
      const g = d3.select(this).append("g")
      const extra = d.funders.slice(2)
      extra.forEach((funder, i) => {
        const ang = (i / extra.length) * 2 * Math.PI
        const x = Math.cos(ang) * (R + 7)
        const y = Math.sin(ang) * (R + 7)
        g.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 2.5)
          .attr("fill", funderColors[funder] || "#94a3b8")
      })
    })

    // Labels
    node.append("text")
      .attr("x", R + 8)
      .attr("y", 5)
      .attr("font-size", 13)
      .attr("fill", "#f1f5f9")
      .style("paint-order", "stroke")
      .style("stroke", "#0f172a")
      .style("stroke-width", "4px")
      .style("stroke-linejoin", "round")
      .text((d: NetworkNode) => d.label)

    // Tick function
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node.attr("transform", (d: NetworkNode) => `translate(${d.x},${d.y})`)

      gInst.style("display", showBackgrounds === "both" || showBackgrounds === "inst" ? "" : "none")
      gLab.style("display", showBackgrounds === "both" || showBackgrounds === "lab" ? "" : "none")
      gLabLabels.style("display", showBackgrounds === "both" || showBackgrounds === "lab" ? "" : "none")

      drawOrganisations()
      drawInstitutes()
      drawLabHulls()
    })

    // Search functionality
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      node.selectAll("circle")
        .attr("opacity", (d: any) => 
          d.id.toLowerCase().includes(q) || d.label.toLowerCase().includes(q) ? 1 : 0.25)
      node.selectAll("text")
        .attr("opacity", (d: any) => 
          d.id.toLowerCase().includes(q) || d.label.toLowerCase().includes(q) ? 1 : 0.2)
    }

    return () => {
      simulation.stop()
    }
  }, [forceStrength, showBackgrounds, edgeLayers, searchTerm, profiles])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[390px_1fr] gap-4">
      {/* Controls Panel */}
      <div className="card-monday space-y-4">
        <h2 className="text-sm font-black text-muted-foreground tracking-wider uppercase">Controls</h2>
        
        {/* Search */}
        <div className="space-y-2">
          <Badge className="bg-gray-800 text-gray-300">🔎 Search by name</Badge>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g. Alice, Martinez, PhD..."
            className="bg-gray-900 border-gray-700"
          />
        </div>

        {/* Layout */}
        <div className="space-y-2">
          <Badge className="bg-gray-800 text-gray-300">🧭 Layout</Badge>
          <div className="flex items-center justify-between">
            <label className="text-sm">Force</label>
            <Input
              type="number"
              value={forceStrength}
              onChange={(e) => setForceStrength(Number(e.target.value))}
              step="10"
              className="w-24 bg-gray-900 border-gray-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Show backgrounds</label>
            <select
              value={showBackgrounds}
              onChange={(e) => setShowBackgrounds(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm"
            >
              <option value="both">All Layers</option>
              <option value="inst">Organisations + Institutes</option>
              <option value="lab">Labs only</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>

        {/* Edge Layers */}
        <div className="space-y-2">
          <Badge className="bg-gray-800 text-gray-300">🧵 Edge Layers</Badge>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edgeLayers.supervises}
                onChange={(e) => setEdgeLayers({ ...edgeLayers, supervises: e.target.checked })}
              />
              Supervises
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edgeLayers.collaborates_with}
                onChange={(e) => setEdgeLayers({ ...edgeLayers, collaborates_with: e.target.checked })}
              />
              Collaborates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edgeLayers.belongs_to}
                onChange={(e) => setEdgeLayers({ ...edgeLayers, belongs_to: e.target.checked })}
              />
              Belongs to
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3 pt-3 border-t border-gray-700">
          <Badge className="bg-gray-800 text-gray-300">💰 Funders (node outlines)</Badge>
          {FUNDING_ACCOUNTS.map(account => (
            <div key={account.id} className="flex items-center gap-2 text-xs">
              <div 
                className="w-4 h-4 rounded-full border-3" 
                style={{ 
                  border: `3px solid ${
                    account.name === "CLuB" ? "#22c55e" :
                    account.name === "BCR" ? "#06b6d4" :
                    account.name === "Deans" ? "#eab308" : "#f97316"
                  }`
                }}
              />
              <span>{account.name}</span>
            </div>
          ))}
          <div className="text-xs text-muted-foreground pt-2">
            Inner ring = 1st funder, Outer ring = 2nd funder, Ticks = additional funders
          </div>
        </div>

        <div className="pt-3 border-t border-gray-700 text-xs text-muted-foreground">
          <div>✅ {profiles.length} people</div>
          <div>✅ {profiles.filter(p => p.reportsTo === null).length} PIs</div>
          <div>✅ {Array.from(new Set(profiles.map(p => p.lab))).length} labs</div>
        </div>
      </div>

      {/* Graph */}
      <div className="card-monday">
        <h2 className="text-sm font-black text-muted-foreground tracking-wider uppercase mb-4">Network Graph</h2>
        <div className="relative rounded-xl overflow-hidden border border-gray-700" style={{
          background: "radial-gradient(1200px 700px at 60% -20%, rgba(59, 130, 246, 0.1), transparent 60%), radial-gradient(900px 600px at -10% 120%, rgba(6, 182, 212, 0.08), transparent 60%)",
          backgroundColor: "#0f172a"
        }}>
          <svg ref={svgRef} className="w-full" style={{ height: "78vh" }} />
        </div>
      </div>
    </div>
  )
}

