"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import * as d3 from "d3"
import { useRealProfiles } from "@/hooks/useRealProfiles"
import { PersonProfile, PositionLevel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { logger } from "@/lib/logger"
import { Loader2 } from "lucide-react"

// --- TYPES ---
interface GraphNode extends d3.SimulationNodeDatum {
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

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
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

// --- HELPERS ---
function getRoleFromPosition(positionLevel?: PositionLevel): string {
    if (!positionLevel) return "Other";

    const level = positionLevel.toLowerCase();

    if (level.includes("student") || level.includes("candidate")) {
        return level.includes("phd") ? "PhD" : "Student";
    }
    if (level.includes("postdoc")) return "Postdoc";
    if (level.includes("professor") || level.includes("fellow") || level.includes("head")) return "PI";
    if (level.includes("manager")) return "Manager";
    if (level.includes("assistant") || level.includes("associate") || level.includes("technician")) return "RA";

    return "Other";
}

function getRoleColor(role: string): string {
    const colors: Record<string, string> = {
        PI: "#ff7f50",      // Coral
        Postdoc: "#ffd36a", // Gold
        PhD: "#6ad1ff",     // Sky Blue
        RA: "#7cffb7",      // Mint
        Manager: "#c39bff", // Lavender
        Student: "#a5b4fc", // Indigo
        Other: "#cbd5e1"    // Slate
    };
    return colors[role] || colors.Other;
}

export function AdvancedNetworkView() {
    const { profiles: allProfiles, loading } = useRealProfiles();
    const svgRef = useRef<SVGSVGElement>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [forceStrength, setForceStrength] = useState(-280);
    const [showBackgrounds, setShowBackgrounds] = useState("both");
    const [edgeLayers, setEdgeLayers] = useState({
        supervises: true,
        collaborates_with: true,
        belongs_to: false,
    });

    // --- DATA ADAPTER ---
    const { nodes, links, organisations, institutes, labs } = useMemo(() => {
        if (!allProfiles.length) return { nodes: [], links: [], organisations: [], institutes: [], labs: [] };

        // 1. Process Profiles & Defaults
        const validProfiles = allProfiles.filter(p => p.firstName && p.lastName);
        const profilesWithDefaults = validProfiles.map(p => ({
            ...p,
            organisationName: p.organisationName || "Unknown Organization",
            instituteName: p.instituteName || "Unknown Institute",
            labName: p.labName || "Unknown Lab"
        }));

        // 2. Extract Hierarchy
        const uniqueOrganisations = Array.from(new Set(profilesWithDefaults.map(p => p.organisationName)));
        const uniqueInstitutes = Array.from(new Set(profilesWithDefaults.map(p => p.instituteName)));
        const uniqueLabs = Array.from(new Set(profilesWithDefaults.map(p => p.labName)));

        // 3. Create Hierarchy Objects
        const orgs: Organisation[] = uniqueOrganisations.map((org, idx) => ({
            id: org.replace(/\s+/g, '_'),
            label: org,
            color: d3.schemeCategory10[idx % 10]
        }));

        const insts: Institute[] = uniqueInstitutes.map((inst, idx) => {
            const profile = profilesWithDefaults.find(p => p.instituteName === inst);
            const orgName = profile?.organisationName || "Unknown Organization";
            const orgId = orgName.replace(/\s+/g, '_');
            const org = orgs.find(o => o.id === orgId);

            return {
                id: inst.replace(/\s+/g, '_'),
                label: inst,
                organisation: orgId,
                color: org ? org.color : d3.schemeSet2[idx % 8]
            };
        });

        const labsList: Lab[] = uniqueLabs.map(lab => {
            const profile = profilesWithDefaults.find(p => p.labName === lab);
            return {
                id: lab.replace(/\s+/g, '_'),
                label: lab,
                institute: (profile?.instituteName || "Unknown Institute").replace(/\s+/g, '_'),
                organisation: (profile?.organisationName || "Unknown Organization").replace(/\s+/g, '_')
            };
        });

        // 4. Create Nodes
        const peopleNodes: GraphNode[] = profilesWithDefaults.map(p => ({
            id: p.id,
            label: `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`,
            role: getRoleFromPosition(p.positionLevel),
            lab: p.labName.replace(/\s+/g, '_'),
            employer: p.reportsToId || p.id, // Use reportsToId
            funders: [], // TODO: Map funding if needed
            organisation: p.organisationName.replace(/\s+/g, '_'),
            institute: p.instituteName.replace(/\s+/g, '_')
        }));

        const labNodes: GraphNode[] = labsList.map(l => ({
            id: l.id,
            label: l.label,
            role: 'Lab',
            lab: l.id,
            funders: [],
            _hidden: true
        }));

        const allNodes = [...peopleNodes, ...labNodes];

        // 5. Create Links
        const allLinks: GraphLink[] = [];

        // Supervision
        profilesWithDefaults.forEach(p => {
            if (p.reportsToId) {
                allLinks.push({
                    source: p.reportsToId,
                    target: p.id,
                    type: 'supervises'
                });
            }
        });

        // Lab Membership
        peopleNodes.forEach(p => {
            allLinks.push({
                source: p.lab,
                target: p.id,
                type: 'belongs_to'
            });
        });

        // Collaboration (Same Lab)
        const labGroups = d3.group(peopleNodes, d => d.lab);
        labGroups.forEach(members => {
            for (let i = 0; i < members.length - 1; i++) {
                for (let j = i + 1; j < members.length; j++) {
                    allLinks.push({
                        source: members[i].id,
                        target: members[j].id,
                        type: 'collaborates_with'
                    });
                }
            }
        });

        return {
            nodes: allNodes,
            links: allLinks,
            organisations: orgs,
            institutes: insts,
            labs: labsList
        };
    }, [allProfiles]);

    // --- RENDERING ---
    useEffect(() => {
        if (!svgRef.current || !nodes.length) return;

        // Clear previous
        d3.select(svgRef.current).selectAll("*").remove();

        const width = 1400;
        const height = 900;
        const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        // Layers
        const gInst = svg.append("g");
        const gLab = svg.append("g");
        const gLinks = svg.append("g");
        const gNodes = svg.append("g");
        const gLabLabels = svg.append("g");

        // Calculate Centers
        const orgCenters: Record<string, { x: number; y: number }> = {};
        organisations.forEach((org, i) => {
            const angle = (i / organisations.length) * 2 * Math.PI;
            orgCenters[org.id] = {
                x: width / 2 + Math.cos(angle) * 350,
                y: height / 2 + Math.sin(angle) * 280
            };
        });

        const instCenters: Record<string, { x: number; y: number }> = {};
        institutes.forEach((inst, i) => {
            const orgCenter = orgCenters[inst.organisation] || { x: width / 2, y: height / 2 };
            const instsInOrg = institutes.filter(inst2 => inst2.organisation === inst.organisation);
            const idxInOrg = instsInOrg.findIndex(inst2 => inst2.id === inst.id);
            const angle = (idxInOrg / instsInOrg.length) * 2 * Math.PI;

            instCenters[inst.id] = {
                x: orgCenter.x + Math.cos(angle) * 200,
                y: orgCenter.y + Math.sin(angle) * 150
            };
        });

        // Initial Positioning
        nodes.forEach(n => {
            if (n.role === 'Lab') return;
            if (n.institute && instCenters[n.institute]) {
                n.x = instCenters[n.institute].x + (Math.random() - 0.5) * 100;
                n.y = instCenters[n.institute].y + (Math.random() - 0.5) * 100;
            } else {
                n.x = width / 2 + (Math.random() - 0.5) * 500;
                n.y = height / 2 + (Math.random() - 0.5) * 500;
            }
        });

        // Simulation
        const simulation = d3.forceSimulation<GraphNode>(nodes)
            .force("link", d3.forceLink<GraphNode, GraphLink>(links)
                .id(d => d.id)
                .distance(l => l.type === 'supervises' ? 100 : l.type === 'collaborates_with' ? 150 : 80)
                .strength(0.5))
            .force("charge", d3.forceManyBody().strength(forceStrength))
            .force("collide", d3.forceCollide<GraphNode>().radius(d => d.role === 'Lab' ? 30 : 25))
            .force("x", d3.forceX<GraphNode>(d => {
                if (d.institute && instCenters[d.institute]) return instCenters[d.institute].x;
                return width / 2;
            }).strength(0.08))
            .force("y", d3.forceY<GraphNode>(d => {
                if (d.institute && instCenters[d.institute]) return instCenters[d.institute].y;
                return height / 2;
            }).strength(0.08));

        // Draw Functions
        function drawOrganisations() {
            const pad = 80;
            const groups = organisations.map(org => {
                const members = nodes.filter(n => n.organisation === org.id && !n._hidden);
                if (!members.length) return null;
                const xs = members.map(m => m.x!);
                const ys = members.map(m => m.y!);
                return {
                    org,
                    x: Math.min(...xs) - pad,
                    y: Math.min(...ys) - pad,
                    w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
                    h: Math.max(...ys) - Math.min(...ys) + 2 * pad
                };
            }).filter(Boolean) as any[];

            const orgGroups = gInst.selectAll("g.org")
                .data(groups, (d: any) => d.org.id)
                .join(enter => {
                    const g = enter.append("g").attr("class", "org");
                    g.append("rect")
                        .attr("rx", 28)
                        .attr("fill", (d: any) => d.org.color)
                        .attr("fill-opacity", 0.05)
                        .attr("stroke", (d: any) => d.org.color)
                        .attr("stroke-opacity", 0.3)
                        .attr("stroke-width", 2);
                    g.append("text")
                        .attr("fill", (d: any) => d.org.color)
                        .attr("font-size", 24)
                        .attr("font-weight", 900)
                        .attr("text-anchor", "middle")
                        .attr("opacity", 0.3)
                        .text((d: any) => d.org.label);
                    return g;
                });

            orgGroups.select("rect")
                .attr("x", (d: any) => d.x)
                .attr("y", (d: any) => d.y)
                .attr("width", (d: any) => d.w)
                .attr("height", (d: any) => d.h);

            orgGroups.select("text")
                .attr("x", (d: any) => d.x + d.w / 2)
                .attr("y", (d: any) => d.y + 40);
        }

        function drawInstitutes() {
            const pad = 50;
            const groups = institutes.map(inst => {
                const members = nodes.filter(n => n.institute === inst.id && !n._hidden);
                if (!members.length) return null;
                const xs = members.map(m => m.x!);
                const ys = members.map(m => m.y!);
                return {
                    inst,
                    x: Math.min(...xs) - pad,
                    y: Math.min(...ys) - pad,
                    w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
                    h: Math.max(...ys) - Math.min(...ys) + 2 * pad
                };
            }).filter(Boolean) as any[];

            const instGroups = gInst.selectAll("g.inst")
                .data(groups, (d: any) => d.inst.id)
                .join(enter => {
                    const g = enter.append("g").attr("class", "inst");
                    g.append("rect")
                        .attr("rx", 20)
                        .attr("fill", (d: any) => d.inst.color)
                        .attr("fill-opacity", 0.1)
                        .attr("stroke", (d: any) => d.inst.color)
                        .attr("stroke-opacity", 0.4)
                        .attr("stroke-width", 2);
                    g.append("text")
                        .attr("fill", (d: any) => d.inst.color)
                        .attr("font-size", 18)
                        .attr("font-weight", 800)
                        .attr("text-anchor", "middle")
                        .attr("opacity", 0.6)
                        .text((d: any) => d.inst.label);
                    return g;
                });

            instGroups.select("rect")
                .attr("x", (d: any) => d.x)
                .attr("y", (d: any) => d.y)
                .attr("width", (d: any) => d.w)
                .attr("height", (d: any) => d.h);

            instGroups.select("text")
                .attr("x", (d: any) => d.x + d.w / 2)
                .attr("y", (d: any) => d.y - 10);
        }

        function drawLabHulls() {
            const hullData = labs.map(l => {
                const pts = nodes.filter(n => !n._hidden && n.lab === l.id).map(n => [n.x!, n.y!] as [number, number]);
                if (pts.length < 3) return null;
                const path = d3.polygonHull(pts);
                return path ? { id: l.id, label: l.label, path } : null;
            }).filter(Boolean) as any[];

            gLab.selectAll("path.lab-hull")
                .data(hullData, (d: any) => d.id)
                .join("path")
                .attr("class", "lab-hull")
                .attr("fill", "none")
                .attr("stroke", "#60a5fa")
                .attr("stroke-opacity", 0.6)
                .attr("stroke-width", 1.5)
                .attr("stroke-dasharray", "4 4")
                .attr("d", (d: any) => `M${d.path.join('L')}Z`);

            gLabLabels.selectAll("text.lab-label")
                .data(hullData, (d: any) => d.id)
                .join("text")
                .attr("class", "lab-label")
                .attr("text-anchor", "middle")
                .attr("font-size", 12)
                .attr("fill", "#94a3b8")
                .text((d: any) => d.label)
                .attr("x", (d: any) => d3.polygonCentroid(d.path)[0])
                .attr("y", (d: any) => d3.polygonCentroid(d.path)[1]);
        }

        // Draw Elements
        const link = gLinks.selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", (d: GraphLink) =>
                d.type === 'supervises' ? '#fbbf24' :
                    d.type === 'collaborates_with' ? '#f472b6' : '#94a3b8')
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", 1.5)
            .style("display", (d: GraphLink) => edgeLayers[d.type] ? null : "none");

        const node = gNodes.selectAll("g.node")
            .data(nodes.filter(n => !n._hidden), (d: any) => d.id)
            .join("g")
            .attr("class", "node")
            .call(d3.drag<SVGGElement, GraphNode>()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }) as any);

        node.append("circle")
            .attr("r", 20)
            .attr("fill", (d: GraphNode) => getRoleColor(d.role))
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        node.append("text")
            .attr("dy", 5)
            .attr("text-anchor", "middle")
            .attr("fill", "#1e293b")
            .attr("font-size", 12)
            .attr("font-weight", "bold")
            .attr("pointer-events", "none")
            .text((d: GraphNode) => d.label);

        // Tick
        simulation.on("tick", () => {
            link
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            node.attr("transform", (d: GraphNode) => `translate(${d.x},${d.y})`);

            if (showBackgrounds !== "off") {
                drawOrganisations();
                drawInstitutes();
                drawLabHulls();
            }
        });

        // Search
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            node.attr("opacity", (d: GraphNode) =>
                d.label.toLowerCase().includes(q) || d.role.toLowerCase().includes(q) ? 1 : 0.1
            );
        } else {
            node.attr("opacity", 1);
        }

        return () => {
            simulation.stop();
        };
    }, [nodes, links, organisations, institutes, labs, forceStrength, showBackgrounds, edgeLayers, searchTerm]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[600px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 h-[800px]">
            {/* Controls */}
            <div className="card-monday space-y-6 p-4 overflow-y-auto">
                <div>
                    <h2 className="text-lg font-bold mb-4">Network Controls</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Search</label>
                            <Input
                                placeholder="Search people..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Force Strength</label>
                            <Input
                                type="range"
                                min="-500"
                                max="-50"
                                value={forceStrength}
                                onChange={e => setForceStrength(Number(e.target.value))}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Backgrounds</label>
                            <select
                                className="w-full p-2 border rounded-md bg-background"
                                value={showBackgrounds}
                                onChange={e => setShowBackgrounds(e.target.value)}
                            >
                                <option value="both">All Layers</option>
                                <option value="off">None</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Connections</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={edgeLayers.supervises}
                                        onChange={e => setEdgeLayers(prev => ({ ...prev, supervises: e.target.checked }))}
                                    />
                                    Supervision
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={edgeLayers.collaborates_with}
                                        onChange={e => setEdgeLayers(prev => ({ ...prev, collaborates_with: e.target.checked }))}
                                    />
                                    Collaboration
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold mb-2">Legend</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: getRoleColor("PI") }} /> PI / Professor
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: getRoleColor("Postdoc") }} /> Postdoc
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: getRoleColor("PhD") }} /> PhD Student
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: getRoleColor("Student") }} /> Student
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: getRoleColor("RA") }} /> Research Assistant
                        </div>
                    </div>
                </div>
            </div>

            {/* Visualization */}
            <div className="card-monday relative overflow-hidden bg-slate-50 rounded-lg border">
                <svg ref={svgRef} className="w-full h-full" />
            </div>
        </div>
    );
}
