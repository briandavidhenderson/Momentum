Technical Architecture: Author Network Visualizer

1. Overview

The Author Network Visualizer is a client-side, single-page application (SPA) designed to visualize academic collaboration networks in a 3D space. It maps relationships between authors based on shared publications, using physics-based layouts to represent the strength of collaborations and the impact of individual researchers.

The core visual metaphor places authors in a 3D "void," where their vertical position (Z-axis) represents their publication volume, and their proximity represents their collaborative frequency.

2. Technology Stack

The application is built using a "vanilla" JavaScript architecture to ensure maximum compatibility with restricted execution environments (such as sandboxed iframes) without requiring a build step.

Core Engine: Three.js (r160) - WebGL rendering engine.

Graph Engine: 3d-force-graph (v1.73) - A high-performance wrapper around d3-force for 3D physics simulations.

Text Rendering: three-spritetext (v1.8) - For rendering 2D text labels that always face the camera (billboarding).

Module System: UMD (Universal Module Definition) via global scripts.

Rationale: ES Modules (import ...) often face CORS or resolution issues in preview environments. We use a robust sequential loader (loadScript promise chain) to manually inject dependencies from CDNs (jsdelivr) into the global window scope.

3. Core Architecture

3.1 Data Pipeline & Transformation

The application ingests raw JSON data representing research papers and transforms it into a graph topology.

Input Schema:

{
  "title": "String",
  "authors": ["Author 1", "Author 2", ...],
  "keywords": ["..."],
  "firstAuthor": "Author 1"
}


Transformation Logic (processPapers):

Node Extraction: Iterates through author lists. An authorStats dictionary aggregates metrics:

firstAuthorCount: Number of times the author appears at index 0.

coAuthorCount: Number of times the author appears at index > 0.

publicationCount: Total papers.

Link Generation (Clique Expansion): For each paper, a clique is formed connecting every author to every other author.

Link Weighting: If a link between A and B already exists, its value is incremented. This strengthens the physics bond, pulling frequent collaborators closer.

3.2 ORCID Integration Pipeline

To facilitate dynamic network growth, the application integrates with the ORCID Public API to fetch authenticated user data and publication history.

User Flow:

Connect ORCID: User clicks "Connect ORCID" button in the UI.

OAuth Authorization: Redirects to ORCID OAuth login. Upon success, returns an Authorization Code.

Token Exchange: Backend (or proxy) exchanges Code for an Access Token and the user's ORCID iD.

Data Ingestion:

Profile Fetch: GET /v3.0/{orcid-id}/person retrieves the user's official name and biography.

Works Fetch: GET /v3.0/{orcid-id}/works retrieves a list of publications (DOI, Title, Contributors).

Graph Injection: The fetched works are parsed into the application's native JSON schema (see 3.1) and injected into the existing graph via processPapers(). This instantly plots the new user and links them to any existing authors in the network.

3.3 3D Rendering Pipeline

The visualization uses a custom rendering strategy to convey multidimensional data on a single node.

Dual-Sphere Node Rendering

Instead of simple primitives, each node is a THREE.Group containing up to two concentric spheres:

Inner Core (Gold): Represents First Author credits.

Geometry: SphereGeometry.

Material: MeshLambertMaterial (Opaque, emissive).

Label: A SpriteText integer floating slightly in front of the core.

Outer Shell (Cyan): Represents Co-Author credits.

Geometry: SphereGeometry (Radius = Inner Radius + Padding).

Material: MeshLambertMaterial with transparent: true, opacity: 0.15, and depthWrite: false (to allow seeing the inner core).

Label: A SpriteText integer floating above the shell.

This visual decoupling allows users to instantly distinguish "Lead Researchers" (large gold cores) from "Collaborative Hubs" (large cyan shells).

Diffusive Field (Links)

To avoid the "hairball" problem common in dense network graphs, we utilize a Diffusive Field technique for edges:

Static Lines: Set to opacity: 0.05 or 0.0 (invisible) by default.

Particle Flow: Connections are visualized using linkDirectionalParticles.

Weak Links (1 paper): Invisible (No particles).

Medium Links (2 papers): Sparse flow (1 particle).

Strong Links (>2 papers): Active flow (Multiple particles, higher speed).
This creates an organic "neural network" aesthetic where only significant pathways are immediately visible.

3.4 Physics Simulation (d3-force)

The layout is governed by a force-directed algorithm running in 3D space:

Link Force: Springs connect collaborators. Shorter for strong links, longer for weak ones.

Charge Force: A repulsive force (strength: -150) prevents nodes from overlapping.

Custom Buoyancy Force:

We inject a custom force to utilize the Z-axis (vertical).

Logic: node.vy += (targetHeight - node.y) * alpha.

Effect: Prolific authors physically "float" higher in the scene, creating a 3D hierarchy where "Ground Level" = Junior Researchers and "Sky Level" = Senior PIs.

4. Key Algorithms & Implementation Details

4.1 Reliable Initialization (initApp)

To solve race conditions in environments with slow CDNs:

We define an array of library URLs in dependency order (Three -> SpriteText -> ForceGraph).

We execute a Promise-based loader that appends <script> tags sequentially.

Only when the final Promise resolves is the startVisualization() function called.

Fallback: A global error handler catches loading failures and displays a user-friendly retry prompt.

4.2 Dynamic Visibility System (updateGraphDisplay)

Changing visibility (e.g., "Hide Connections") without re-calculating the physics simulation is crucial for performance.

We use the Accessor Pattern. The graph properties (linkWidth, linkOpacity, particles) are defined as functions:

.linkWidth(link => state.showLinks ? 1 : 0)


When state changes (e.g., button click), we call updateGraphDisplay(), which re-invokes these accessors on all graph elements, instantly refreshing the visual state while preserving the physics equilibrium.

5. Interaction Model

Highlighting: A Set data structure (highlightNodes, highlightLinks) tracks the active selection.

Dimming: When a node is clicked, a global render pass sets the opacity of all non-neighbor nodes to 0.1.

Camera Control: We do not lock the camera to the node to avoid motion sickness; instead, we allow free orbit but provide a "Reset View" button to return to the global cluster view.

6. Scalability & Future Roadmap

For a production-grade version of this tool, the following architectural upgrades would be recommended:

Build System: Migrate to Vite or Webpack with TypeScript. This would allow tree-shaking Three.js (currently loading the huge monolithic build) and type safety for the data parsers.

Web Workers: Offload the d3-force simulation to a Web Worker. Currently, physics calculations run on the main thread, which limits the graph to ~1000 nodes before frame drops occur.

Backend Integration: Replace the static JSON array with a GraphQL endpoint (e.g., Hasura or Firebase) to query authors dynamically as the user pans the camera (Level-of-Detail loading).

Spatial Indexing: Implement an Octree for raycasting (hover detection) to improve interaction performance on dense graphs.