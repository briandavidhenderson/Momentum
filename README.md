# Momentum - Lab Management & Project Timeline System

A comprehensive lab management application with Gantt chart visualization, electronic lab notebook, equipment tracking, and team collaboration tools.

## Features

### Project Management
- 📊 **Visual Gantt Chart** - Timeline view for all projects and tasks
- 📁 **Regular & Master Projects** - Simple projects or complex grant-funded projects with workpackages
- ✅ **Task & Subtask Management** - Hierarchical task breakdown with todo lists
- 📈 **Progress Tracking** - Automatic cascade calculation from todos → subtasks → tasks → workpackages → projects
- 🎯 **Work Package System** - Organize large projects into manageable workpackages

### Lab Operations
- 🧪 **Electronic Lab Notebook (ELN)** - Document experiments with notes and observations
- 🔬 **Equipment Management** - Track lab equipment status and maintenance
- 📦 **Inventory System** - Monitor reagents and consumables with reorder suggestions
- 📋 **Day-to-Day Board** - Quick task board for daily lab activities
- 🗳️ **Lab Polls** - Team decision-making and feedback

### Team & Network
- 👥 **Team Management** - Comprehensive people profiles with roles and affiliations
- 🌐 **Network View** - Visualize organizational connections and collaborations
- 🔐 **Firebase Authentication** - Secure user management

### Technical Features
- 💾 **Firestore Persistence** - Real-time sync across devices and sessions
- ⚡ **Offline-First** - PWA capabilities for offline access
- 🎨 **Beautiful UI** - Modern design with Tailwind CSS
- 🚀 **Fast & Responsive** - Built with Next.js 14 and React

## Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Firebase project (for authentication and Firestore)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up Firebase configuration:
   - Copy `.env.example` to `.env.local` (if exists)
   - Add your Firebase credentials
   - See [SETUP_FIREBASE_ENV.md](SETUP_FIREBASE_ENV.md) for details

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Quick Start Guide

For first-time users, see [QUICK_START_NEXT_SESSION.md](QUICK_START_NEXT_SESSION.md) for:
- Feature overview
- Testing checklist
- Known issues
- Development priorities

## Usage

### Creating Projects

**Regular Project** (simple tasks):
1. Click **"New Project"**
2. Select "Regular Project"
3. Enter project details and dates
4. Add tasks with subtasks and todos

**Master Project** (grant-funded with workpackages):
1. Set up your profile first
2. Click **"New Project"**
3. Select "Master Project"
4. Add grant information and funding details
5. Create workpackages with tasks

### Managing Tasks & Todos

1. **Right-click** a task in the Gantt chart
2. Select **"Open Details"** to view task panel
3. **Expand subtasks** to see todo lists
4. **Check/uncheck todos** - progress cascades automatically
5. **Add new todos** - type and press Enter
6. **Delete todos** - hover and click × button

### Using the Electronic Lab Notebook

1. Navigate to the **ELN** tab
2. Create a new experiment entry
3. Add notes, observations, and protocols
4. Save entries with timestamps

### Equipment & Inventory

1. Go to **Equipment** panel
2. Add lab equipment and devices
3. Link reagents and consumables
4. Monitor stock levels and reorder suggestions

## Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **Database**: Firebase Firestore with real-time sync
- **Authentication**: Firebase Auth
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Gantt Chart**: gantt-task-react
- **Network Visualization**: D3.js
- **Icons**: Lucide React
- **State Management**: React hooks with Zustand
- **Deployment**: Firebase Hosting (static export)

## Project Structure

```
├── app/
│   ├── page.tsx                    # Main application with view switching
│   ├── layout.tsx                  # Root layout with system fonts
│   └── globals.css                 # Global styles & Tailwind
├── components/
│   ├── GanttChart.tsx              # Gantt chart visualization
│   ├── TaskDetailPanel.tsx         # Task details with subtasks & todos
│   ├── TodoList.tsx                # Todo list with progress bar
│   ├── NetworkView.tsx             # D3 network visualization
│   ├── ElectronicLabNotebook.tsx   # ELN with experiments
│   ├── EquipmentStatusPanel.tsx    # Equipment & inventory management
│   ├── DayToDayBoard.tsx           # Daily task board
│   ├── ProfileManagement.tsx       # User profile editor
│   ├── OnboardingFlow.tsx          # New user onboarding
│   └── ui/                         # Reusable UI components
├── lib/
│   ├── types.ts                    # TypeScript type definitions
│   ├── firestoreService.ts         # Firebase Firestore operations
│   ├── progressCalculation.ts      # Progress cascade engine
│   ├── equipmentUtils.ts           # Equipment helpers
│   ├── personHelpers.ts            # People management utilities
│   ├── store.ts                    # Zustand state management
│   └── validationSchemas.ts        # Zod validation schemas
├── docs/
│   └── archive/                    # Historical documentation
├── firestore.rules                 # Firestore security rules
├── firestore.indexes.json          # Firestore indexes
└── firebase.json                   # Firebase configuration
```

## Data Persistence

Data is stored in Firebase Firestore with real-time synchronization:
- **Real-time Sync**: Changes propagate instantly across all sessions
- **Offline Support**: PWA capabilities for offline access
- **Security**: Firestore rules enforce user permissions
- **Backup**: Firebase handles automatic backups

## Building for Production

```bash
# Build the application
npm run build

# Test production build locally
npm start

# Deploy to Firebase
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy Firestore rules and indexes
firebase deploy --only firestore
```

**Build Status**: ✅ Passing (251 kB)

## Documentation

- **[SESSION_FINAL_SUMMARY.md](SESSION_FINAL_SUMMARY.md)** - Latest session achievements and status
- **[NEXT_SESSION_TODO.md](NEXT_SESSION_TODO.md)** - Prioritized development tasks
- **[QUICK_START_NEXT_SESSION.md](QUICK_START_NEXT_SESSION.md)** - Quick reference for developers
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Feature reference guide
- **[PROJECT_CLEANUP_PLAN.md](PROJECT_CLEANUP_PLAN.md)** - Maintenance and refactoring strategy
- **[SETUP_FIREBASE_ENV.md](SETUP_FIREBASE_ENV.md)** - Firebase configuration guide
- **[docs/archive/](docs/archive/)** - Historical documentation

## Current Status

### ✅ Working Features
- Todo system with Firestore persistence
- Progress cascade calculation
- Regular & Master project creation
- Work package management
- Electronic Lab Notebook (basic)
- Equipment & inventory tracking
- Network visualization
- Day-to-day task board
- Lab polls

### ⚠️ In Progress
- Multi-person color coding for Gantt chart
- Voice notes for ELN
- Image annotation for ELN

### 🧪 Testing Needed
- End-to-end todo persistence
- Multi-user concurrent edits
- Reagents linking verification
- Real-time sync across tabs

## Contributing

See [NEXT_SESSION_TODO.md](NEXT_SESSION_TODO.md) for current priorities and development tasks.

## License

MIT
