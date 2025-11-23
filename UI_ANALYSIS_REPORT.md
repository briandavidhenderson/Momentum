# 🎨 COMPREHENSIVE UI ANALYSIS - Momentum Lab Management System

**Date**: November 21, 2025
**Status**: Complete Analysis
**Purpose**: Frontend UI modification preparation

---

## 📁 PROJECT STRUCTURE OVERVIEW

```
Momentum/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx               # Root layout with AppWrapper & ToastProvider
│   ├── page.tsx                 # Main application page
│   ├── globals.css              # Global styles & design tokens
│   ├── gantt-custom.css         # Custom Gantt chart styling
│   └── auth/orcid/callback/     # ORCID OAuth callback
│       └── page.tsx
│
├── components/                   # React components (78 files)
│   ├── ui/                      # Primitive UI components (16 files)
│   ├── views/                   # Main view pages (13 files)
│   ├── dialogs/                 # Dialog/modal components (3 files)
│   ├── admin/                   # Admin-specific components
│   ├── equipment/               # Equipment management components (3 files)
│   ├── orders/                  # Order management components (4 files)
│   ├── projects/                # Project management components (6 files)
│   ├── whiteboard/              # Whiteboard feature components (3 files)
│   └── [various shared components]
│
├── lib/                         # Utilities, services, hooks
│   ├── hooks/                   # Custom React hooks (11 files)
│   ├── services/                # Service layer (Firebase, etc.)
│   ├── types/                   # TypeScript type definitions
│   └── [utility functions]
│
├── hooks/                       # Additional hooks directory
│   └── useRealProfiles.ts
│
└── tailwind.config.ts           # Tailwind CSS configuration
```

---

## 🎨 DESIGN SYSTEM

### Color Palette

#### Brand Colors (Teal/Cyan)
```css
--brand-50:  hsl(174, 80%, 96%)   /* Very light teal */
--brand-100: hsl(174, 78%, 90%)
--brand-200: hsl(174, 76%, 80%)
--brand-300: hsl(174, 72%, 68%)
--brand-400: hsl(174, 68%, 56%)
--brand-500: hsl(174, 66%, 46%)   /* PRIMARY - Main teal */
--brand-600: hsl(174, 66%, 38%)
--brand-700: hsl(174, 66%, 30%)
--brand-800: hsl(174, 66%, 24%)
--brand-900: hsl(174, 66%, 18%)   /* Very dark teal */
```

#### Semantic Colors
```css
--success-500: hsl(142, 71%, 45%)  /* Green */
--warn-500:    hsl(45, 93%, 47%)   /* Yellow/Amber */
--danger-500:  hsl(0, 72%, 51%)    /* Red */
--info-500:    hsl(210, 79%, 46%)  /* Blue */
```

#### Status Colors (Workpackages)
```css
--status-wp-active:    hsl(199, 89%, 49%)  /* Blue #0EA5E9 */
--status-wp-planning:  hsl(45, 93%, 52%)   /* Yellow #FACC15 */
--status-wp-atRisk:    hsl(21, 90%, 54%)   /* Orange #F97316 */
--status-wp-completed: hsl(142, 72%, 45%)  /* Green #22C55E */
--status-wp-onHold:    hsl(215, 20%, 65%)  /* Gray #94A3B8 */
--status-deliverable:  hsl(258, 90%, 66%)  /* Purple #8B5CF6 */
```

#### Gray Scale (Neutrals)
```css
--gray-50:  hsl(210, 20%, 98%)  /* Almost white */
--gray-100: hsl(210, 20%, 96%)
--gray-200: hsl(210, 18%, 92%)
--gray-300: hsl(210, 16%, 86%)
--gray-400: hsl(210, 14%, 76%)
--gray-500: hsl(210, 12%, 65%)
--gray-600: hsl(210, 12%, 50%)
--gray-700: hsl(210, 14%, 38%)
--gray-800: hsl(210, 18%, 28%)
--gray-900: hsl(210, 20%, 16%)  /* Almost black */
```

### Design Tokens

#### Border Radius
```css
--radius-xs:   4px
--radius-sm:   6px
--radius-md:   10px
--radius-lg:   16px
--radius-xl:   20px
--radius-2xl:  24px
--radius-full: 9999px
--radius:      1rem (16px) /* Default */
```

#### Shadows
```css
--shadow-xs:     0 1px 2px rgba(0, 0, 0, 0.04)
--shadow-sm:     0 2px 4px rgba(0, 0, 0, 0.05)
--shadow-md:     0 4px 12px rgba(0, 0, 0, 0.08)
--shadow-lg:     0 8px 24px rgba(0, 0, 0, 0.10)
--shadow-xl:     0 12px 36px rgba(0, 0, 0, 0.12)
--shadow-card:   0 4px 12px rgba(0, 0, 0, 0.05)
--shadow-toast:  0 6px 18px rgba(0, 0, 0, 0.10)
--shadow-dialog: 0 20px 50px rgba(0, 0, 0, 0.15)
```

#### Spacing Scale
```css
--space-xs:  4px
--space-sm:  8px
--space-md:  12px
--space-lg:  16px
--space-xl:  24px
--space-2xl: 32px
--space-3xl: 48px
```

#### Transitions
```css
--transition-fast:   100ms ease
--transition-base:   150ms ease
--transition-slow:   250ms ease
--transition-slower: 350ms ease
--ease-spring:       cubic-bezier(0.34, 1.56, 0.64, 1)
--ease-smooth:       cubic-bezier(0.4, 0, 0.2, 1)
```

### Typography
```css
Font Family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif

h1, .h1: text-4xl (36px) font-bold
h2, .h2: text-2xl (24px) font-bold
h3, .h3: text-xl (20px) font-semibold
```

### Component Classes

#### Card Styling (Monday.com inspired)
```css
.card-monday {
  border-radius: 16px
  background: hsl(var(--surface-2))
  border: 1px solid hsl(var(--border))
  box-shadow: shadow-card
  padding: 28px
  gap: 16px
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)
}

.card-monday:hover {
  box-shadow: shadow-elevated
  transform: translateY(-2px)
}
```

---

## 📦 UI COMPONENT LIBRARY

### Primitive Components (`components/ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| **Alert** | alert.tsx | Alert messages and notifications |
| **Alert Dialog** | alert-dialog.tsx | Confirmation dialogs (Radix UI) |
| **Avatar** | avatar.tsx | User avatar display |
| **Badge** | badge.tsx | Status badges and tags |
| **Button** | button.tsx | Primary button component with variants |
| **Card** | card.tsx | Container component for content sections |
| **Checkbox** | checkbox.tsx | Checkbox input (Radix UI) |
| **Dialog** | dialog.tsx | Modal dialog wrapper (Radix UI) |
| **Dropdown Menu** | dropdown-menu.tsx | Dropdown menu component |
| **Input** | input.tsx | Text input field |
| **Label** | label.tsx | Form label component |
| **Progress** | progress.tsx | Progress bar |
| **Select** | select.tsx | Select dropdown (Radix UI) |
| **Tabs** | tabs.tsx | Tabbed interface (Radix UI) |
| **Textarea** | textarea.tsx | Multi-line text input |
| **Toast** | toast.tsx | Toast notification system |

**Total**: 16 primitive components

---

## 🖼️ MAIN VIEWS (`components/views/`)

| View | File | Purpose |
|------|------|---------|
| **Calendar Events** | CalendarEvents.tsx | Event management and calendar view |
| **Day-to-Day Board** | DayToDayBoard.tsx | Kanban-style task board |
| **Electronic Lab Notebook** | ElectronicLabNotebook.tsx | Lab notebook with multimodal content |
| **Equipment Management** | EquipmentManagement.tsx | Equipment tracking and maintenance |
| **Funding Admin** | FundingAdmin.tsx | Grant and funding management |
| **My Tasks View** | MyTasksView.tsx | Personal task list view |
| **Orders & Inventory** | OrdersInventory.tsx | Order and inventory management |
| **People View** | PeopleView.tsx | Team directory and profiles |
| **Personal Profile** | PersonalProfilePage.tsx | User's own profile page |
| **Privacy Dashboard** | PrivacyDashboard.tsx | Privacy settings and controls |
| **Profile Management** | ProfileManagement.tsx | Admin profile management |
| **Project Dashboard** | ProjectDashboard.tsx | Gantt chart and project overview |
| **Project Detail** | ProjectDetailPage.tsx | Detailed project view |

**Total**: 13 main views

---

## 🔧 FEATURE-SPECIFIC COMPONENTS

### Admin Components (`components/admin/`)
- **EnableBookingButton.tsx** - Admin control for equipment booking feature

### Dialog Components (`components/dialogs/`)
- **AddSupplyDialog.tsx** - Add supplies to equipment
- **CheckStockDialog.tsx** - Check and update stock quantities
- **EquipmentEditorDialog.tsx** - Edit equipment details and specifications

### Equipment Components (`components/equipment/`)
- **EquipmentAvailabilityTimeline.tsx** - Visual timeline of equipment bookings
- **MyBookingsView.tsx** - User's equipment bookings
- **QuickBookingDialog.tsx** - Quick equipment booking interface

### Order Components (`components/orders/`)
- **LinkedOrdersList.tsx** - List of linked orders
- **OrderCard.tsx** - Individual order card display
- **OrderEditDialog.tsx** - Edit existing order
- **OrderFormDialog.tsx** - Create new order
- **ReorderSuggestionsPanel.tsx** - AI-powered reorder suggestions

### Project Components (`components/projects/`)
- **DeliverableCard.tsx** - Deliverable display card
- **DeliverableDetailsPanel.tsx** - Detailed deliverable view
- **DependencyPickerDialog.tsx** - Select task dependencies
- **ProjectDetailPanel.tsx** - Project details sidebar
- **ProjectImportDialog.tsx** - Import projects from JSON
- **WorkpackageCard.tsx** - Workpackage display card
- **WorkpackageDialog.tsx** - Create/edit workpackages

### Whiteboard Components (`components/whiteboard/`)
- **WhiteboardCanvas.tsx** - Canvas drawing area
- **WhiteboardEditor.tsx** - Main whiteboard editor
- **WhiteboardSidebar.tsx** - Whiteboard tools sidebar

---

## 🔩 SHARED COMPONENTS

### Authentication & User
- **AuthPage.tsx** - Login/authentication page
- **OrcidBadge.tsx** - ORCID ID display badge
- **PositionBadge.tsx** - Position/role badge display

### Calendar
- **CalendarConnections.tsx** - Connect external calendars (Google, Microsoft)
- **CalendarEventCard.tsx** - Event display card
- **CalendarSettings.tsx** - Calendar preferences
- **EventDialog.tsx** - Create/edit calendar events

### Content Management
- **AIContentDisclaimer.tsx** - Disclaimer for AI-generated content
- **CommentsSection.tsx** - Comments thread
- **ELNJupyterCanvasV2.tsx** - Jupyter-style notebook canvas
- **ELNReportGenerator.tsx** - Generate reports from ELN data

### Dialogs & Modals
- **DataClearDialog.tsx** - Confirm data clearing
- **DeletionConfirmationDialog.tsx** - Generic deletion confirmation
- **DeliverableDialog.tsx** - Deliverable create/edit dialog
- **FunderCreationDialog.tsx** - Create new funder
- **ProjectCreationDialog.tsx** - Create new project
- **ProjectExportDialog.tsx** - Export project data

### Display Components
- **GanttChart.tsx** - Gantt chart for project timeline (uses gantt-task-react)
- **PersonnelList.tsx** - List of team members (draggable)
- **TaskDetailPanel.tsx** - Detailed task view
- **TodoList.tsx** - Todo list component

### Equipment & Resources
- **AdvancedNetworkView.tsx** - Network-wide equipment view
- **EquipmentNetworkPanel.tsx** - Equipment network panel
- **EquipmentStatusPanel.tsx** - Equipment status dashboard

### Financial
- **PersonalLedger.tsx** - Personal financial ledger
- **ProjectFinancials.tsx** - Project financial overview
- **ProjectResources.tsx** - Project resource allocation

### Miscellaneous
- **CookieConsentBanner.tsx** - GDPR cookie consent
- **ErrorBoundary.tsx** - React error boundary
- **LabPollPanel.tsx** - Lab polls and surveys
- **NotificationBell.tsx** - Notification center
- **OnboardingFlow.tsx** - Multi-step onboarding wizard

---

## 🎣 CUSTOM HOOKS

### Authentication & User State
```typescript
lib/hooks/useAuth.ts          - Authentication state and user info
hooks/useRealProfiles.ts      - Real-time profile subscriptions
```

### Data Management
```typescript
lib/hooks/useBookings.ts      - Equipment booking management
lib/hooks/useCalendar.ts      - Calendar event management
lib/hooks/useDayToDayTasks.ts - Day-to-day task management
lib/hooks/useDeliverables.ts  - Project deliverable management
lib/hooks/useELN.ts           - Electronic lab notebook hooks
lib/hooks/useEquipment.ts     - Equipment management hooks
lib/hooks/useEvents.ts        - Event management
lib/hooks/useFirestoreSubscriptions.ts - Firestore real-time subscriptions
```

### Utility Hooks
```typescript
lib/hooks/index.ts            - Hook exports barrel file
```

**Total**: 11 custom hooks

---

## 🎭 UI PATTERNS & CONVENTIONS

### Component Architecture
```
View Components (views/)
    ↓ compose
Feature Components (feature-specific/)
    ↓ use
Primitive Components (ui/)
    ↓ styled with
Design Tokens (globals.css)
```

### Naming Conventions
- **Views**: `[Feature]View.tsx` or `[Feature]Page.tsx`
- **Dialogs**: `[Feature]Dialog.tsx`
- **Panels**: `[Feature]Panel.tsx`
- **Cards**: `[Feature]Card.tsx`
- **Primitives**: lowercase with hyphens (e.g., `button.tsx`)

### State Management
- **Global State**: AppContext (`lib/AppContext.tsx`)
- **Local State**: React useState/useReducer
- **Server State**: Firestore real-time subscriptions via custom hooks
- **Form State**: Controlled components with local state

### Styling Approach
- **Primary**: Tailwind CSS utility classes
- **Tokens**: CSS custom properties in `globals.css`
- **Components**: `.card-monday`, `.status-pill`, etc.
- **Animations**: Tailwind + CSS transitions

---

## 📊 COMPONENT STATISTICS

| Category | Count | Percentage |
|----------|-------|------------|
| Total TSX Components | 82 | 100% |
| Primitive UI Components | 16 | 19.5% |
| Main Views | 13 | 15.9% |
| Feature Components | 28 | 34.1% |
| Shared Components | 21 | 25.6% |
| App/Page Components | 4 | 4.9% |

### By Feature Domain

| Domain | Component Count |
|--------|----------------|
| Projects & Tasks | 15 |
| Equipment & Resources | 8 |
| Orders & Inventory | 5 |
| People & Profiles | 5 |
| Calendar & Events | 5 |
| Lab Notebook (ELN) | 4 |
| Whiteboard | 3 |
| Financial/Funding | 3 |
| Admin | 1 |
| Authentication | 2 |
| Miscellaneous | 15 |

---

## 🔍 KEY UI FEATURES

### 1. **Responsive Design**
- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Grid and flexbox layouts
- Container max-width: 1400px

### 2. **Dark Mode Support**
- `darkMode: ["class"]` in Tailwind config
- CSS custom properties for theming
- **Note**: Dark mode tokens not yet defined in globals.css

### 3. **Animations**
```typescript
// Tailwind animations configured:
- accordion-down/up (Radix UI)
- shimmer (loading states)

// CSS transitions on:
- Buttons (hover, active, focus)
- Cards (hover elevation)
- All interactive elements
```

### 4. **Accessibility**
- Focus visible states with brand color outline
- Radix UI primitives (ARIA compliant)
- Semantic HTML structure
- Keyboard navigation support

### 5. **Interactive Elements**
```css
/* Micro-interactions */
button:hover     → brightness(1.05)
button:active    → scale(0.98)
button:focus     → outline with brand color

/* Card interactions */
.card-monday:hover → translateY(-2px) + elevated shadow
```

---

## 🎨 STYLING FILES

### CSS Files (Project-specific)
1. **app/globals.css** (305 lines)
   - Design tokens and CSS custom properties
   - Base styles and typography
   - Component utility classes
   - Status pill styles
   - Card styling (Monday.com inspired)

2. **app/gantt-custom.css**
   - Custom styles for Gantt chart library
   - Overrides for gantt-task-react

### Configuration
- **tailwind.config.ts** - Tailwind configuration with custom tokens

---

## 🔗 DEPENDENCIES (UI-Related)

### UI Libraries
- **Radix UI** - Headless UI primitives
  - @radix-ui/react-alert-dialog
  - @radix-ui/react-dialog
  - @radix-ui/react-dropdown-menu
  - @radix-ui/react-select
  - @radix-ui/react-tabs
  - @radix-ui/react-checkbox
  - @radix-ui/react-progress

### Styling
- **tailwindcss** - Utility-first CSS framework
- **tailwindcss-animate** - Animation utilities

### Visualization
- **gantt-task-react** - Gantt chart component
- **react-day-picker** - Calendar/date picker

### Icons
- **lucide-react** - Icon library (likely used throughout)

---

## 🎯 UI MODIFICATION RECOMMENDATIONS

### Strengths to Maintain
✅ Consistent design token system
✅ Well-organized component structure
✅ Modern card-based UI (Monday.com style)
✅ Comprehensive color palette
✅ Smooth animations and transitions
✅ Radix UI for accessibility

### Areas for Improvement

#### 1. **Dark Mode Implementation**
**Current Status**: Framework ready, but no dark mode styles defined

**Action Items**:
- Define dark mode color tokens in globals.css
- Add `.dark` class styles for all components
- Test color contrast ratios (WCAG AAA)
- Add theme toggle component

#### 2. **Consistency Across Views**
**Observations**:
- Some views use different card styles
- Inconsistent spacing in some dialogs
- Mixed use of button variants

**Action Items**:
- Audit all 13 main views for consistency
- Standardize card usage (use `.card-monday` everywhere)
- Create button variant guidelines
- Document spacing patterns

#### 3. **Component Documentation**
**Current**: Minimal JSDoc comments

**Action Items**:
- Add prop documentation to all shared components
- Create Storybook or component showcase
- Document usage examples
- Add accessibility notes

#### 4. **Performance Optimization**
**Considerations**:
- 82 components - check bundle size
- Lazy load views that aren't immediately needed
- Code split by route
- Optimize images and assets

#### 5. **Design System Formalization**
**Current**: Tokens exist but not documented

**Action Items**:
- Create design system documentation
- Document component variants and states
- Create usage guidelines
- Add visual examples

---

## 🛠️ MODIFICATION WORKFLOW

### Phase 1: Foundation
1. Review and understand current design system
2. Document any missing design tokens
3. Create component inventory with screenshots
4. Identify inconsistencies

### Phase 2: Planning
1. Define new UI direction (if applicable)
2. Create mockups/wireframes
3. Map components to new design
4. Plan migration strategy

### Phase 3: Implementation
1. Update design tokens first (globals.css)
2. Update primitive components (ui/)
3. Update shared components
4. Update view components
5. Test across all views

### Phase 4: Refinement
1. Accessibility audit
2. Performance testing
3. Cross-browser testing
4. Mobile responsiveness check
5. User testing

---

## 📋 COMPONENT MODIFICATION CHECKLIST

When modifying UI components, ensure:

- [ ] Design tokens used (not hard-coded colors)
- [ ] Responsive breakpoints tested (mobile, tablet, desktop)
- [ ] Hover/focus/active states defined
- [ ] Accessibility attributes present (ARIA, semantic HTML)
- [ ] Dark mode variant created (when implemented)
- [ ] Animation/transition smooth
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] TypeScript types updated
- [ ] Props documented
- [ ] Consistent with other components

---

## 🎨 QUICK REFERENCE: KEY FILES

### Must-Read Before Modifying UI
```
1. app/globals.css           - All design tokens and utilities
2. tailwind.config.ts        - Tailwind customization
3. app/layout.tsx            - Root layout structure
4. components/ui/            - Primitive building blocks
5. lib/AppContext.tsx        - Global state management
```

### Most Complex Components (Handle with Care)
```
1. components/GanttChart.tsx                - External library integration
2. components/views/ProjectDashboard.tsx    - Multiple nested components
3. components/OnboardingFlow.tsx            - Multi-step state machine
4. components/views/ElectronicLabNotebook.tsx - Rich content editor
5. components/whiteboard/WhiteboardEditor.tsx - Canvas manipulation
```

### Frequently Modified
```
1. components/ui/button.tsx     - Primary interactive element
2. components/ui/dialog.tsx     - Used throughout app
3. components/ui/badge.tsx      - Status indicators
4. components/ui/card.tsx       - Container component
5. app/globals.css              - Styling adjustments
```

---

## 📝 NOTES & OBSERVATIONS

### Architecture Patterns
- **Next.js 14 App Router** - Server/client components
- **Component Composition** - Small, reusable pieces
- **Controlled Components** - Forms use React state
- **Render Props** - Some dialogs use children pattern
- **Context API** - Global app state (AppContext)

### Code Quality
- ✅ TypeScript throughout
- ✅ Consistent file structure
- ✅ Proper separation of concerns
- ⚠️ Some components are large (could be split)
- ⚠️ Limited unit tests visible

### Browser Compatibility
- Modern CSS features (custom properties, flexbox, grid)
- Autoprefixer via PostCSS (assumed)
- Target: Modern evergreen browsers

---

## 🚀 NEXT STEPS

Based on this analysis, you can now:

1. **Choose specific components to modify**
2. **Update the design system** (colors, tokens, etc.)
3. **Implement dark mode** (framework is ready)
4. **Standardize patterns** across all views
5. **Improve accessibility** (WCAG compliance)
6. **Optimize performance** (code splitting, lazy loading)
7. **Create UI documentation** (Storybook, style guide)

---

## 📞 MODIFICATION SUPPORT

When making UI changes:

- **Start with globals.css** - Change tokens, see effects everywhere
- **Test in app/page.tsx** - Main entry point to see changes
- **Use browser DevTools** - Inspect CSS custom properties
- **Check tailwind.config.ts** - For custom Tailwind classes
- **Review component hierarchy** - Understand composition before modifying

---

**Document Version**: 1.0
**Last Updated**: November 21, 2025
**Total Components Analyzed**: 82
**Total Files Reviewed**: 100+

---

This analysis provides a complete map of the UI structure. You can now confidently modify any aspect of the frontend with full understanding of the component relationships, styling system, and architectural patterns.
