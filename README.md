# Momentum - Project Timeline Management

A beautiful, offline-first Gantt chart application for managing projects, tasks, and team members.

## Features

- 📊 **Visual Gantt Chart** - See all your projects and tasks in a timeline view
- 📁 **Project Management** - Create, edit, and delete projects with custom colors
- ✅ **Task Management** - Add multiple tasks to projects with progress tracking
- 👥 **Team Management** - Assign people to projects and tasks
- 💾 **Offline-First** - All data persists in local storage
- 🎨 **Beautiful UI** - Modern, visually pleasing design with Tailwind CSS
- ⚡ **Fast & Responsive** - Built with Next.js and React

## Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating a Project

1. Click the **"New Project"** button
2. Enter project details:
   - Project name
   - Start and end dates
   - Assign to a team member (optional)
   - Choose a color
3. Click **"Create Project"**

### Adding Tasks

1. Click the **"New Task"** button
2. Select the project for the task
3. Enter task details:
   - Task name
   - Start and end dates
   - Assign to a team member (optional)
   - Set progress percentage
4. Click **"Create Task"**

### Managing Team Members

1. Click the **"Add Person"** button
2. Enter the person's name
3. Choose a color for identification
4. Click **"Add Person"**

### Editing & Deleting

- **Double-click** on any item in the Gantt chart to edit it
- Use the **Edit** button (pencil icon) in the project/task lists
- Use the **Delete** button (trash icon) to remove items

## Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Gantt Chart**: gantt-task-react
- **Icons**: Lucide React
- **Storage**: Local Storage (offline-first)

## Project Structure

```
├── app/
│   ├── page.tsx          # Main application page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── GanttChart.tsx    # Gantt chart visualization
│   ├── ProjectDialog.tsx # Project creation/edit dialog
│   ├── TaskDialog.tsx    # Task creation/edit dialog
│   ├── PersonDialog.tsx  # Person creation/edit dialog
│   └── ui/               # Reusable UI components
├── lib/
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
└── public/               # Static assets
```

## Data Persistence

All data is stored locally in your browser's localStorage:
- Projects, tasks, and team members persist between sessions
- No backend required - fully offline-first
- Clear browser data to reset the application

## Building for Production

```bash
npm run build
npm run start
```

For static export (Firebase Hosting):
1. Enable `output: 'export'` in `next.config.js`
2. Run `npm run build`
3. Deploy the `out` directory

## License

MIT
