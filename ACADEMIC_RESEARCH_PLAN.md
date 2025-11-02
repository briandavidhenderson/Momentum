# Academic Research Management System - Implementation Plan

## Overview
Transform the existing lab management system into a comprehensive academic research management platform with project boards, knowledge hub, funding tracking, compliance, collaboration, and AI automation features.

## Phase 1: Enhanced Project Structure & Academic Boards

### 1.1 Extend Project Data Model
**Files: `lib/types/index.ts`**
- Add academic-specific fields to `Project` interface:
  - `funderType?: "HorizonEurope" | "SFI" | "NIH" | "ERC" | "Other"`
  - `grantId?: string`
  - `budgetTotal?: number`
  - `startDate?: Date`
  - `endDate?: Date`
  - `ethicsId?: string`
  - `workPackages?: WorkPackage[]`
  
**New Types:**
- `WorkPackage` interface: `id, title, description, budget, responsible, deliverables, dueDate`
- `Milestone` interface: `id, workPackageId, title, dueDate, status, deliverables`
- `Deliverable` interface: `id, title, type, status, doi?, linkedOutputs?`
- `BudgetLine` interface: `id, category, allocated, spent, workPackageId?`

### 1.2 Academic Board View Component
**File: `app/(dashboard)/projects/[id]/board/page.tsx` (NEW)**
- Create board view similar to Monday.com with academic columns:
  - Work Package / Milestone / Task / Responsible / Due / Status / Budget Line / Deliverables / Linked DOIs / Ethics ID
- Use DataTables-style sorting/filtering
- Color-coded status indicators
- Inline editing capabilities

### 1.3 Enhanced Task Model
**Files: `lib/types/index.ts`, `lib/hooks/useTasks.ts`**
- Extend `Task` interface:
  - `workPackageId?: string`
  - `milestoneId?: string`
  - `budgetLineId?: string`
  - `deliverableIds?: string[]`
  - `linkedDOIs?: string[]`
  - `ethicsId?: string`

## Phase 2: Project Templates

### 2.1 Template Data Model
**File: `lib/types/index.ts`**
- Extend `Template` interface:
  - `funderType: "HorizonEurope" | "SFI" | "NIH" | "ERC" | "PhD" | "Paper"`
  - `templateData: { workPackages, milestones, defaultBudgetLines, structure }`
  - `description, category`

### 2.2 Template System
**Files:**
- `lib/hooks/useTemplates.ts` (NEW)
- `app/(dashboard)/templates/page.tsx` (ENHANCE)
- `app/(dashboard)/projects/new/page.tsx` (ENHANCE)

**Features:**
- Pre-defined templates for:
  - Horizon Europe (standard work packages, budget categories)
  - SFI (Irish funding structure)
  - NIH (US funding structure)
  - ERC (European Research Council)
  - PhD supervision tracking template
  - Paper submission workflow template
- Template selector in project creation
- Apply template to populate work packages, milestones, budget lines

### 2.3 PhD Supervision Tracking
**File: `app/(dashboard)/supervision/page.tsx` (NEW)**
- Student tracking board
- Milestones: Proposal, Ethics, Data Collection, Writing, Submission, Defense
- Progress tracking per student
- Meeting notes integration
- Deadline reminders

### 2.4 Paper Submission Workflow
**File: `app/(dashboard)/papers/page.tsx` (NEW)**
- Paper tracking interface
- Status: Draft → Internal Review → Submitted → Under Review → Revision → Accepted → Published
- Journal information, impact factors
- Submission dates, deadlines
- Co-author management
- Link to projects/work packages

## Phase 3: Research Knowledge Hub

### 3.1 Enhanced Document System
**Files: `lib/types/index.ts`**
- Extend `Document` interface:
  - `internalDOI?: string` (UUID-based)
  - `citations?: DocumentCitation[]`
  - `documentType: "Protocol" | "SOP" | "MeetingNotes" | "GrantDraft" | "Paper" | "Other"`
  - `versions: DocumentVersion[]`
  - `parentDocumentId?: string` (for versioning)
  - `checklistItems?: ChecklistItem[]` (convertible to tasks)

**New Types:**
- `DocumentVersion`: `version, changes, authorId, createdAt, hash`
- `DocumentCitation`: `citedByDocumentId, context, citationFormat`

### 3.2 Docs Hub UI
**File: `app/(dashboard)/docs/page.tsx` (NEW)**
- Document library with filtering
- Version history viewer
- Citation generator (internal DOI/UUID)
- Convert checklist to tasks feature
- Rich text editor integration
- Tagging and search

### 3.3 Document Versioning
**Files:**
- `lib/hooks/useDocuments.ts` (NEW/ENHANCE)
- `components/docs/VersionHistory.tsx` (NEW)
- `components/docs/CitationGenerator.tsx` (NEW)

**Features:**
- Automatic version tracking
- Diff viewer for changes
- Rollback capability
- Internal DOI generation: `MOMENTUM-YYYY-XXXX`
- Citation export (APA, MLA, BibTeX)

## Phase 4: Funding & Reporting Dashboard

### 4.1 Budget Tracking
**Files: `lib/types/index.ts`**
- `Budget` interface: `projectId, total, spent, byCategory, byWorkPackage, transactions`
- `BudgetTransaction`: `id, date, amount, category, description, workPackageId, receiptPath`

**File: `lib/hooks/useBudget.ts` (NEW)**
- Real-time budget calculations
- Spend vs. allocated tracking
- Integration hooks for finance system (manual input initially)

### 4.2 Reporting Dashboard
**File: `app/(dashboard)/funding/page.tsx` (NEW)**
- Real-time metrics:
  - Spend vs. budget (visual charts)
  - Deliverable status (complete/in-progress/overdue)
  - Publication metrics (manual input initially, API-ready)
  - Staff/student involvement
- Funder-specific views
- Export functionality

### 4.3 Publication Metrics
**Files:**
- `lib/types/index.ts`: `Publication` interface
- `lib/hooks/usePublications.ts` (NEW)
- `components/funding/PublicationMetrics.tsx` (NEW)

**Features:**
- Manual publication entry (ORCID/Crossref API ready)
- Citation counts, impact factors
- Link to projects/work packages
- Auto-tagging to objectives

### 4.4 Report Generation
**File: `lib/utils/reportGenerator.ts` (NEW)**
- Export functions for:
  - SFI progress reports
  - EU Horizon reports
  - NIH reporting
  - Custom templates
- PDF generation
- Excel export

## Phase 5: Enhanced Compliance & Safety

### 5.1 Ethics Tracking
**File: `lib/types/index.ts`**
- `EthicsApproval` interface: `id, projectId, ethicsId, status, submissionDate, approvalDate, expiryDate, renewalDate, documents, comments`

**File: `app/(dashboard)/compliance/ethics/page.tsx` (NEW)**
- Ethics approvals dashboard
- Renewal reminders
- Document storage
- Status tracking

### 5.2 Training Certificates
**File: `lib/types/index.ts`**
- `TrainingCert` interface: `id, userId, type, issuer, issueDate, expiryDate, documentPath, renewalReminder`

**File: `lib/hooks/useTraining.ts` (NEW)**
- Certificate tracking
- Automated expiry reminders
- Bulk upload

### 5.3 Enhanced Safety Module
**File: `app/(dashboard)/safety/page.tsx` (ENHANCE)**
- Document signing workflow
- Permissioned access levels
- Inspector access mode
- Audit trail for all safety documents
- Automated renewal reminders

## Phase 6: Collaboration Layer

### 6.1 Shared Timelines
**File: `app/(dashboard)/projects/[id]/timeline/page.tsx` (ENHANCE)**
- Enhanced Gantt view with work packages
- Milestone markers
- Collaborative editing
- Export options

### 6.2 Comment Threads
**Files:**
- `lib/types/index.ts`: Enhance `Comment` interface with `threadId, parentId, attachments`
- `components/common/CommentThread.tsx` (NEW)
- Add to project, task, document pages

### 6.3 Version History
**File: `components/common/VersionHistory.tsx` (NEW)**
- Track changes to projects, tasks, documents
- Visual diff viewer
- Rollback capabilities

### 6.4 Observer Mode
**File: `lib/types/index.ts`**
- `Membership.role`: Add `"Observer"` role
- Read-only access for external collaborators/funders

**File: `app/(dashboard)/projects/[id]/settings/page.tsx` (NEW)**
- Access control settings
- Observer dashboard (aggregated KPIs only)

## Phase 7: AI/Automation Features

### 7.1 Grant Copilot
**File: `lib/utils/ai/grantCopilot.ts` (NEW)**
- Placeholder structure for AI integration
- Functions:
  - `summarizeProgress(projectId): Promise<string>`
  - `generateLaySummary(project): Promise<string>`
  - `fillReportTemplate(template, projectData): Promise<object>`
- API-ready for OpenAI/Anthropic integration

### 7.2 Smart Tagging
**File: `lib/utils/ai/smartTagging.ts` (NEW)**
- Auto-tag outputs to project objectives
- Keyword extraction
- Category suggestions

### 7.3 Predictive Alerts
**File: `firebase/functions/src/alerts.ts` (NEW)**
- Cloud Functions for:
  - "WP3 deliverable overdue by 2 weeks"
  - "Budget underspend trend detected"
  - "Ethics renewal due in 30 days"
  - "Publication milestone approaching"
- Scheduled checks
- Email/notification triggers

## Phase 8: UI/UX Enhancements

### 8.1 Spreadsheet-like Tables
**File: `components/ui/DataTable.tsx` (NEW)**
- Sortable, filterable columns
- Inline editing
- Bulk actions
- Export to CSV/Excel

### 8.2 Contextual Views
- Board view: `/projects/[id]/board`
- Kanban view: `/projects/[id]/tasks` (existing, enhance)
- Gantt view: `/projects/[id]/timeline` (existing, enhance)
- Dashboard: Aggregated KPIs

### 8.3 Color Themes
**File: `lib/utils/projectThemes.ts` (NEW)**
- Per-project color schemes
- Progress bars with milestone countdowns
- Visual status indicators

### 8.4 Quick-start Wizard
**File: `app/(dashboard)/projects/new/page.tsx` (ENHANCE)**
- Template selection
- Funding agency setup
- Work package creation
- Budget allocation

## Implementation Order & Priorities

### Sprint 1: Foundation (High Priority)
1. Extend Project & Task data models
2. Academic board view component
3. Work package/milestone system
4. Basic template system

### Sprint 2: Templates & Workflows (High Priority)
1. Funding agency templates
2. PhD supervision tracking
3. Paper submission workflow
4. Template application logic

### Sprint 3: Knowledge Hub (Medium Priority)
1. Document versioning
2. Internal DOI system
3. Citation generator
4. Docs hub UI

### Sprint 4: Funding & Reporting (High Priority)
1. Budget tracking system
2. Funding dashboard
3. Report generation
4. Publication metrics (manual input)

### Sprint 5: Compliance Enhancements (Medium Priority)
1. Ethics tracking
2. Training certificates
3. Enhanced safety module
4. Automated reminders

### Sprint 6: Collaboration (Medium Priority)
1. Comment threads
2. Version history
3. Observer mode
4. Shared timelines enhancement

### Sprint 7: AI & Automation (Lower Priority)
1. Grant Copilot structure (placeholders)
2. Smart tagging (basic keyword extraction)
3. Predictive alerts (Cloud Functions)

### Sprint 8: Polish (Lower Priority)
1. UI/UX refinements
2. Performance optimization
3. Documentation
4. Testing

## Database Schema Additions

### Firestore Collections (New)
- `workPackages/{id}`
- `milestones/{id}`
- `deliverables/{id}`
- `budgetLines/{id}`
- `budgetTransactions/{id}`
- `ethicsApprovals/{id}`
- `trainingCerts/{id}`
- `publications/{id}`
- `documentVersions/{id}`

### Firestore Indexes
Update `firestore.indexes.json` with:
- Composite indexes for work packages by project
- Budget queries by project and category
- Deliverables by status and due date
- Publications by project and type

## Security Rules Updates

**File: `firestore.rules`**
- Add rules for new collections
- Observer role permissions (read-only)
- Work package/milestone access controls
- Budget visibility (PI/Owner only)

## Dependencies to Add

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "xlsx": "^0.18.5",
    "@tanstack/react-table": "^8.0.0",
    "react-diff-viewer": "^3.2.0",
    "uuid": "^9.0.0"
  }
}
```

## Notes
- Keep Firestore (no migration to PostgreSQL)
- AI features: Placeholder structure, API-ready for future integration
- External APIs: Manual input forms first, API hooks prepared
- All features maintain existing Firebase architecture
- Static export compatibility maintained for Firebase Hosting


