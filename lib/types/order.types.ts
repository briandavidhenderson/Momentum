// ============================================================================
// ORDER TYPES
// ============================================================================

import type { OrderStatus } from './common.types'

/**
 * Category - Product category for organization
 */
export interface Category {
  id: string
  name: string
  emoji: string
  subcategories: string[]
}

/**
 * CATEGORIES - Standard lab supply categories
 */
export const CATEGORIES: Category[] = [
  {
    id: "general-consumables",
    name: "General Consumables",
    emoji: "🧪",
    subcategories: [
      "Tubes (microcentrifuge, Falcon, PCR, cryovials)",
      "Pipette tips & filter tips",
      "Serological pipettes",
      "Petri dishes & plates (6-, 12-, 24-, 96-well, etc.)",
      "Reservoirs & troughs",
      "Gloves, masks, lab coats",
      "Parafilm, foil, sealing films",
      "Weigh boats, spatulas, funnels",
      "Labels, markers, tape",
    ],
  },
  {
    id: "reagents-chemicals",
    name: "Reagents & Chemicals",
    emoji: "⚗️",
    subcategories: [
      "Buffers & salts",
      "Detergents & surfactants",
      "Enzymes & substrates",
      "Reducing agents & inhibitors",
      "Stains & dyes",
      "Antibodies & aptamers",
      "Standards & calibrants",
      "Solvents (ethanol, methanol, acetone, DMSO, etc.)",
      "Media supplements (FBS, antibiotics, amino acids)",
      "Cryoprotectants & preservatives",
    ],
  },
  {
    id: "cell-culture",
    name: "Cell Culture",
    emoji: "🧫",
    subcategories: [
      "Culture media (DMEM, RPMI, etc.)",
      "Serum & supplements (FBS, glutamine, insulin, etc.)",
      "Trypsin, EDTA, PBS",
      "Culture flasks, dishes, plates",
      "Filter units, bottle tops",
      "Cell scrapers, spreaders",
      "Cryogenic storage boxes & vials",
      "CO₂ incubator accessories (trays, sensors, gaskets)",
    ],
  },
  {
    id: "molecular-biology",
    name: "Molecular Biology",
    emoji: "🔬",
    subcategories: [
      "Nucleic acid extraction kits",
      "PCR reagents & master mixes",
      "Primers, oligos, aptamer libraries",
      "Restriction enzymes & ligases",
      "Plasmid prep kits",
      "Electrophoresis reagents (agarose, loading dye, ladders)",
      "DNA/RNA ladders",
      "cDNA synthesis & RT kits",
      "Gel imaging consumables",
    ],
  },
  {
    id: "protein-biochemistry",
    name: "Protein Biochemistry",
    emoji: "💧",
    subcategories: [
      "Protein purification columns & resins (Ni-NTA, ion exchange, SEC)",
      "Chromatography buffers",
      "SDS-PAGE gels & reagents",
      "Western blot membranes & antibodies",
      "Blocking buffers, detection reagents",
      "Protease/phosphatase inhibitors",
      "BCA/Bradford assay kits",
      "Dialysis tubing",
      "Concentrators & spin filters",
    ],
  },
  {
    id: "microfluidics-analytical",
    name: "Microfluidics & Analytical Systems",
    emoji: "🧲",
    subcategories: [
      "Microfluidic chips & cartridges",
      "Syringe pumps & tubing",
      "Connectors, fittings, ferrules",
      "Microvalves & manifolds",
      "PDMS, SU-8, photoresist materials",
      "Cleanroom consumables (wafers, masks, gloves)",
      "Optical components (filters, mirrors, lenses)",
      "Calibration fluids & standards",
    ],
  },
  {
    id: "cell-analysis-flow",
    name: "Cell Analysis & Flow Cytometry",
    emoji: "🧍‍♂️",
    subcategories: [
      "Flow cytometry tubes & filters",
      "Antibody panels & fluorochromes",
      "Fixation & permeabilization buffers",
      "Compensation beads",
      "Cytometer cleaning fluids",
      "Microscope slides & coverslips",
      "Fluorescent dyes (DAPI, FITC, etc.)",
    ],
  },
  {
    id: "equipment-instruments",
    name: "Equipment & Instruments",
    emoji: "🔧",
    subcategories: [
      "Micropipettes & dispensers",
      "Centrifuges & rotors",
      "pH meters, balances",
      "Vortexers, mixers, shakers",
      "Thermal cyclers, electrophoresis units",
      "Water baths, heating blocks",
      "Spectrophotometers, plate readers",
      "Microscopes (brightfield, fluorescence)",
      "Pumps, valves, regulators",
    ],
  },
  {
    id: "storage-safety",
    name: "Storage & Safety",
    emoji: "🌡️",
    subcategories: [
      "Cryogenic storage (LN₂, -80 °C, -20 °C freezers)",
      "Refrigerator consumables (racks, boxes)",
      "Spill kits, absorbents",
      "Chemical storage cabinets",
      "Waste containers (biohazard, chemical, sharps)",
      "Fire extinguishers, first aid kits",
    ],
  },
  {
    id: "administrative-misc",
    name: "Administrative / Miscellaneous",
    emoji: "🧾",
    subcategories: [
      "Inventory barcodes & tracking labels",
      "Calibration & maintenance logs",
      "Cleaning agents (ethanol, Virkon, etc.)",
      "Disposable wipes & swabs",
      "Shipping containers (dry ice boxes, specimen mailers)",
      "Training & safety documentation",
    ],
  },
]

/**
 * Order - Supply order for lab consumables/equipment
 *
 * UPDATED: Account linking is now REQUIRED and includes project/funder info
 * UPDATED: Added hierarchical project linking (Project → Workpackage → Deliverable → ProjectTask)
 *
 * Orders should ideally be linked to a specific Deliverable for accurate budget tracking
 * and to enable deliverables to show their required supplies/equipment.
 */
export interface Order {
  id: string
  productName: string
  catNum: string
  supplier: string
  url?: string
  priority?: "normal" | "high" | "critical"

  // Linking (UPDATED: Account is now REQUIRED)
  accountId: string               // ✅ REQUIRED: Link to funding account
  accountName: string             // Cached
  fundingAllocationId?: string    // Optional: Specific allocation within the account
  allocationName?: string         // Cached
  funderId: string                // ✅ Cached from account
  funderName: string              // Cached
  masterProjectId: string         // ✅ Cached from account
  masterProjectName: string       // Cached

  // NEW: Hierarchical Project Linking (PREFERRED)
  // Orders should ideally be linked to a specific deliverable for accurate budget tracking
  linkedProjectId?: string        // Link to unified Project
  linkedWorkpackageId?: string    // Link to specific Workpackage
  linkedDeliverableId?: string    // PREFERRED: Link to specific Deliverable
  linkedProjectTaskId?: string    // Optional: Link to specific ProjectTask

  // DEPRECATED: Old linking fields (use linkedProjectTaskId instead of taskId)
  taskId?: string                 // @deprecated Use linkedProjectTaskId instead
  workpackageId?: string          // @deprecated Use linkedWorkpackageId instead

  // Provenance fields (for traceability)
  sourceDeviceId?: string         // Device this order originated from
  sourceSupplyId?: string         // Supply this order originated from
  sourceInventoryItemId?: string  // Inventory item this order originated from

  // Status
  status: OrderStatus
  orderedBy: string               // PersonProfile ID
  orderedDate?: Date
  receivedDate?: Date
  expectedDeliveryDate?: Date
  quantity?: number               // Number of units ordered (defaults to 1)

  // Financial
  priceExVAT: number
  vatAmount?: number
  totalPrice?: number
  currency: string
  invoiceNumber?: string
  poNumber?: string  // Purchase order number

  // Categorization
  category?: string               // Category ID
  subcategory?: string            // Subcategory name

  // Metadata
  notes?: string
  createdBy: string               // PersonProfile ID
  createdDate: Date
  updatedAt?: Date

  // Legacy field (DEPRECATED)
  chargeToAccount?: string // Deprecated: use accountId
  labId?: string // Added labId to fix build error
}
