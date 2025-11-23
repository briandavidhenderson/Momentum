"use strict";
// ============================================================================
// ORDER TYPES
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORIES = void 0;
/**
 * CATEGORIES - Standard lab supply categories
 */
exports.CATEGORIES = [
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
];
//# sourceMappingURL=order.types.js.map