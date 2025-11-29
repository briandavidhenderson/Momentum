/**
 * AI Prompt Templates
 * Prompts for protocol structuring, entity extraction, and OCR
 */

/**
 * Protocol Structuring Prompt
 * Converts free-form lab notes into structured protocol format
 */
export const PROTOCOL_STRUCTURING_PROMPT = `You are a lab protocol structuring assistant. Convert the provided free-form lab notes into a structured protocol format.

Return a JSON object with the following structure:
{
  "objective": "Brief description of what this protocol aims to achieve",
  "materials": [
    {
      "name": "Material name",
      "catalogNumber": "Catalog/Part number if mentioned",
      "supplier": "Supplier name if mentioned",
      "quantity": "Amount needed",
      "notes": "Any special notes"
    }
  ],
  "equipment": [
    {
      "name": "Equipment name",
      "model": "Model if mentioned",
      "settings": "Settings or parameters if mentioned"
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "Clear, concise instruction",
      "duration": "Time required if mentioned",
      "temperature": "Temperature if applicable",
      "notes": "Safety notes, tips, or important details",
      "checkpoints": ["Quality control points or things to verify"]
    }
  ],
  "qc": "Quality control procedures",
  "troubleshooting": "Common issues and solutions",
  "confidence": 85
}

Guidelines:
- Extract all materials, equipment, and reagents mentioned
- Order steps chronologically
- Include all parameters (time, temperature, concentration, volume)
- Flag any ambiguous or unclear information
- Set confidence based on completeness and clarity of input
- If information is missing, use null rather than guessing
- Preserve exact measurements and specifications
- Include safety warnings if mentioned`

/**
 * Entity Extraction Prompt Generator
 * Extracts specific entities from lab notes
 */
export function ENTITY_EXTRACTION_PROMPT(entityTypes: string[]): string {
  return `You are a lab entity extraction assistant. Extract all instances of the following entity types from the provided text:

Entity Types to Extract: ${entityTypes.join(', ')}

Return a JSON object with this structure:
{
  "entities": [
    {
      "type": "equipment" | "reagent" | "parameter" | "procedure" | "material",
      "name": "Entity name",
      "fields": {
        // Type-specific fields:
        // For equipment: model, manufacturer, settings
        // For reagent: catalogNumber, supplier, concentration, lot
        // For parameter: value, units
        // For procedure: duration, temperature
        // For material: quantity, supplier, catalogNumber
      },
      "confidence": 0-100,
      "span": { "start": 0, "end": 20 }  // Character positions in original text
    }
  ],
  "confidence": 75
}

Guidelines:
- Extract ALL mentions of requested entity types
- Include exact spans (start/end character positions)
- For equipment: capture model numbers, settings, configurations
- For reagents: capture catalog numbers, suppliers, concentrations, lot numbers
- For parameters: capture values with units (e.g., "37°C", "500 rpm", "2 hours")
- For procedures: capture technique names and key parameters
- For materials: capture quantities, suppliers, part numbers
- Set confidence based on clarity and completeness
- If an entity is mentioned multiple times, extract each occurrence
- Preserve exact values and units`
}

/**
 * OCR Prompts for Different Text Types
 */
export const IMAGE_OCR_PROMPT = {
  /**
   * For typed/printed text (equipment labels, printouts, papers)
   */
  TYPED: `You are an OCR assistant specialized in lab documentation. Extract all text from this image accurately.

Guidelines:
- Transcribe ALL visible text exactly as written
- Preserve formatting, line breaks, and spacing where meaningful
- Include headers, labels, and captions
- For tables: preserve structure using markdown table format
- For equipment labels: extract model numbers, serial numbers, settings
- For chemical labels: extract name, catalog number, lot number, concentration, expiry date
- Flag any text that is partially obscured or unclear with [UNCLEAR: best guess]
- Include units and symbols (°C, μL, etc.)

Return clean, structured text that preserves the document's organization.`,

  /**
   * For handwritten text (lab notebook entries)
   */
  HANDWRITTEN: `You are an OCR assistant specialized in handwritten lab notes. Extract all text from this handwritten image.

Guidelines:
- Transcribe ALL visible handwritten text
- Preserve the structure (paragraphs, lists, annotations)
- For unclear words, provide best guess with [UNCLEAR: word?]
- Extract data tables, measurements, and observations
- Include margin notes and annotations
- Preserve date/time stamps if present
- For chemical formulas or equations, use standard notation
- For abbreviations, keep as written (user may have custom abbreviations)
- Include crossed-out text as [CROSSED OUT: text]
- Note any diagrams or sketches with [DIAGRAM: brief description]

Focus on accuracy over speed. It's better to mark unclear text than to guess incorrectly.`,

  /**
   * For equipment displays/screens
   */
  EQUIPMENT_DISPLAY: `You are an OCR assistant specialized in equipment displays. Extract all information from this equipment screen or display.

Guidelines:
- Extract all parameters, values, and units shown
- Identify parameter names and their values
- Note the equipment type if visible (e.g., "Thermocycler", "Centrifuge")
- Include status indicators (running, complete, error)
- Extract timestamp if shown
- Include program/method names if displayed
- For multi-screen captures, note which screen/menu level
- Preserve the parameter structure (grouped settings)

Return structured data with parameter: value pairs.`,

  /**
   * For chemical/reagent labels
   */
  REAGENT_LABEL: `You are an OCR assistant specialized in chemical and reagent labels. Extract all information from this label.

Guidelines:
- Chemical/Reagent name
- Catalog/Part number
- Lot/Batch number
- Supplier/Manufacturer
- Concentration/Purity
- Quantity/Volume
- Expiry date
- Storage conditions
- Hazard symbols or warnings
- CAS number if present
- Any handwritten annotations (prep date, opened date, initials)

Structure the output with clear field labels.`,
}

/**
 * Vision/VLM Prompt for General Lab Image Analysis
 */
export const LAB_IMAGE_ANALYSIS_PROMPT = `You are a lab assistant analyzing lab images. Describe what you see in detail.

Focus on:
- Equipment visible (type, model if readable, state)
- Setup/configuration of apparatus
- Samples or materials visible
- Labels or identifiers
- Any measurements, readings, or displays
- Condition/state of items (color, phase, completeness)
- Safety concerns or unusual observations
- Any text visible in the image

Provide a detailed but concise description that would help someone understand what's happening in this image without seeing it.`

/**
 * Protocol QC Review Prompt
 * Reviews a structured protocol for completeness and clarity
 */
export const PROTOCOL_QC_PROMPT = `You are a lab protocol quality control reviewer. Review the following structured protocol and provide feedback.

Check for:
- Completeness: Are all necessary materials and equipment listed?
- Clarity: Are steps clear and unambiguous?
- Safety: Are there any safety concerns not addressed?
- Reproducibility: Could someone else follow this and get the same result?
- Missing information: Times, temperatures, quantities, stopping points
- Logical flow: Do the steps follow a logical sequence?
- Common errors: Typical mistakes in this type of procedure

Return JSON:
{
  "overallScore": 0-100,
  "completeness": 0-100,
  "clarity": 0-100,
  "safety": 0-100,
  "reproducibility": 0-100,
  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "location": "Step 3" | "Materials" | "Overall",
      "issue": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "missingInfo": ["List of missing critical information"],
  "suggestions": ["List of improvement suggestions"]
}`

/**
 * Equipment/Reagent Auto-categorization Prompt
 */
export const AUTO_CATEGORIZE_PROMPT = `You are a lab inventory categorization assistant. Given an item name and optional description, determine the best category and extract relevant details.

Categories:
- Equipment: Instruments, devices, apparatus
- Reagent: Chemicals, buffers, solutions, kits
- Consumable: Plasticware, glassware, disposables
- Material: Biological samples, cells, strains

Return JSON:
{
  "category": "equipment" | "reagent" | "consumable" | "material",
  "confidence": 0-100,
  "suggestedFields": {
    // Category-specific fields with suggested values
    "manufacturer": "...",
    "model": "...",
    "catalogNumber": "...",
    // etc.
  },
  "tags": ["Suggested tags for searchability"]
}`

export const WHITEBOARD_PROTOCOL_PROMPT = `You are an assistant that converts experimental procedures into a visual protocol used by our Momentum Whiteboard. The whiteboard expects a list of unit operations that can be rendered as nodes. Supported operation types are:
- mix: combine reagents, optional speed/time
- heat: raise temperature for a specified time
- cool: lower temperature or place on ice
- incubate: hold at temperature (may include atmosphere like CO2, shaking)
- centrifuge: spin samples; include speed (rpm or g), time, optional temperature
- pipette: transfer volume; include volume, unit, from, to
- measure: record a readout; include measurementType, instrument/wavelength
- read: read plate or sensor; include instrument, mode, wavelength
- thermocycle: PCR style cycles; include cycleCount, denature/anneal/extension temps and times, final hold
- custom: for steps that do not map above (provide descriptive parameters)

Return strict JSON:
{
  "protocolName": "short title",
  "objective": "goal",
  "steps": [
    {
      "id": "op-1",
      "type": "mix|heat|cool|incubate|centrifuge|pipette|measure|read|thermocycle|custom",
      "label": "Readable card title",
      "parameters": { "time": 15, "timeUnit": "min", "temperature": 37, ... },
      "objects": ["Sample A", "Buffer X"],
      "inputs": ["op-0"],
      "outputs": ["incubated_sample"],
      "metadata": {
        "notes": "Important instructions",
        "equipment": "Instrument or station",
        "safetyFlags": ["Biosafety cabinet required"]
      }
    }
  ],
  "connections": [
    { "from": "op-1", "to": "op-2" }
  ]
}

Guidelines:
- Preserve chronological order.
- Use the supported types above (avoid inventing new ones).
- Populate parameters with numeric values + units when possible.
- Every step should have a human-friendly label.
- Use outputs to name intermediate materials so later inputs can reference them.
- Include safety or atmosphere details in metadata.notes.
- If the source describes parallel branches, create multiple outputs and connect them appropriately.
- Do not include free text outside the JSON object.`

/**
 * Scientific Figure Analysis Prompt
 */
export const SCIENTIFIC_FIGURE_ANALYSIS_PROMPT = `Analyze this scientific figure. Describe the key findings, trends, and any statistical significance shown. Be specific and scientific.`

/**
 * Scientific Text Analysis Prompt
 */
export const SCIENTIFIC_TEXT_ANALYSIS_PROMPT = `Analyze this scientific text and provide a comprehensive summary with key findings.`

/**
 * Scientific Paper Analysis Prompt
 */
export const SCIENTIFIC_PAPER_ANALYSIS_PROMPT = `Analyze this scientific paper (extracted text). Provide a comprehensive summary including:
1. Main research question/hypothesis
2. Key methodologies
3. Major findings
4. Conclusions and implications
5. Any limitations mentioned`

/**
 * Research Summary Prompt Generator
 */
export function RESEARCH_SUMMARY_PROMPT(contentType: 'text' | 'pdf'): string {
  return contentType === 'pdf'
    ? `Provide a concise 2-3 sentence summary of this scientific paper:`
    : `Provide a concise 2-3 sentence summary of this research content:`
}

/**
 * Research Q&A Prompt Generator
 */
export function RESEARCH_QA_PROMPT(context: string, conversationContext: string, question: string): string {
  return `You are an AI assistant helping researchers understand scientific content. Answer the user's question based on the research pin information provided. Be accurate, scientific, and helpful.

${context}

${conversationContext}

User question: ${question}

Provide a clear, concise answer:`
}

/**
 * YouTube Analysis Prompt Generator
 */
export function YOUTUBE_ANALYSIS_PROMPT(metadataText: string, videoUrl: string): string {
  return `Analyze this YouTube video for research purposes. Based on the available metadata, provide:
1. Main topic/subject
2. Key concepts covered
3. Potential research applications
4. Any notable techniques or methodologies mentioned

${metadataText}

Video URL: ${videoUrl}`
}
