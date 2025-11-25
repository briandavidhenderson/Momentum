Protocol Extraction Logic: Cell-SELEX
This document outlines the logic used to transform the PDF "Development of DNA aptamers using Cell-SELEX" (nprot.2010.66) into a UnitOperation node graph.
1. Stream Identification
The method describes distinct preparation steps before the main interaction. I identified three parallel streams:
Buffer Preparation: Reagents (DPBS, Glucose, MgCl2) need to be combined first.
Library Preparation: The ssDNA library must be denatured and folded before exposure to cells.
Cell Preparation: Target cells must be washed and assessed for viability.
These streams converge at the Incubation step.
2. Unit Operation Mapping
The paper's narrative was parsed into discrete actions defined in protocolConfig.tsx.
Paper Text Segment
Extracted Operation
Parameters
Objects
"Add 20 µl of... DNA library to 350 µl of binding buffer... heat at 95°C for 5 min"
heat
95°C, 5 min
ssDNA Library, Binding Buffer
"Snap-cool on ice"
cool
4°C, 10 min
Denatured Library
"Centrifuge cells at 150g for 3 min... Resuspend cells in washing buffer"
centrifuge
150g, 3 min
Target Cells
"Incubate the mixture on ice for 1 h on a rotary shaker"
incubate
4°C, 60 min, Shaking
Library, Cells
"Heat the cell mixture at 95°C for 10 min... centrifuge... collect supernatant"
heat
95°C, 10 min
Cells, Water
"PCR amplification... denaturation at 95°C for 30s... annealing at 56.3°C"
thermocycle
95/56.3/72°C
Eluted DNA, Primers
"Add 500 µl of 200 mM NaOH... collect eluate"
custom (ssDNA Gen)
RT, 30 min
PCR Product, NaOH

3. Parameter Normalization
Time: Converted all durations to minutes or seconds based on protocolConfig schema.
Temperature: Standardized to Celsius integer values.
Volumes: Extracted where specific (e.g., "350 µl", "500 µl").
4. Flow Logic (Graph Topology)
Unlike a linear document, the whiteboard requires spatial coordinates (x, y).
Parallelism: Library Prep (X=350) and Cell Prep (X=650) are placed horizontally adjacent at Y=50.
Convergence: Both flow into Incubation (X=500, Y=450).
Looping: While the paper describes 12-16 rounds, the schematic represents one cycle. The connection from op-ssdna-gen to op-neg-selection implies the progression to the next phase or round.
5. Notes on Specific Steps
Elution: In Round 1, elution is done in water. In subsequent rounds, it is done in binding buffer. The diagram defaults to Round 1 (Water) as per the "Initial DNA library pool preparation" section.
Negative Selection: This is conditional (after Round 2). It was added as a downstream node to show the full complexity of the mature protocol.
