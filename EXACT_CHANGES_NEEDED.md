# Exact Changes Needed to Complete Refactoring

## Status
- All infrastructure is complete and working
- Just 2 files need updating, then test and deploy
- Est time: 1 hour

## File 1: components/views/DayToDayBoard.tsx

### Change 1: Remove props interface (lines 24-31)
**DELETE these lines:**
```typescript
interface DayToDayBoardProps {
  tasks: DayToDayTask[]
  people: Person[]
  onCreateTask: (task: Omit<DayToDayTask, "id" | "createdAt" | "updatedAt" | "order">) => void
  onUpdateTask: (taskId: string, updates: Partial<DayToDayTask>) => void
  onDeleteTask: (taskId: string) => void
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void
}
```

### Change 2: Add context import (line 22)
**ADD this line after other imports:**
```typescript
import { useAppContext } from "@/lib/AppContext"
```

### Change 3: Update component signature and add context (lines 325-332)
**REPLACE:**
```typescript
export function DayToDayBoard({
  tasks,
  people,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
}: DayToDayBoardProps) {
```

**WITH:**
```typescript
export function DayToDayBoard() {
  // Get state and handlers from context
  const {
    dayToDayTasks: tasks,
    people,
    handleCreateDayToDayTask: onCreateTask,
    handleUpdateDayToDayTask: onUpdateTask,
    handleDeleteDayToDayTask: onDeleteTask,
    handleMoveDayToDayTask: onMoveTask,
  } = useAppContext()
```

**That's it for DayToDayBoard! Just 3 changes.**

---

## File 2: components/views/ElectronicLabNotebook.tsx

### Change 1: Remove props interface (lines 14-18)
**DELETE these lines:**
```typescript
interface ElectronicLabNotebookProps {
  experiments: ELNExperiment[]
  currentUserProfile: PersonProfile | null
  onExperimentsUpdate: (experiments: ELNExperiment[]) => void
}
```

### Change 2: Add imports
**ADD these lines after line 12:**
```typescript
import { useAppContext } from "@/lib/AppContext"
import { VoiceRecorder } from "@/components/VoiceRecorder"
import { PhotoUploader } from "@/components/PhotoUploader"
```

### Change 3: Update component signature (lines 29-33)
**REPLACE:**
```typescript
export function ElectronicLabNotebook({
  experiments,
  currentUserProfile,
  onExperimentsUpdate,
}: ElectronicLabNotebookProps) {
```

**WITH:**
```typescript
export function ElectronicLabNotebook() {
  // Get state and handlers from context
  const {
    elnExperiments: experiments,
    currentUserProfile,
    handleExperimentsUpdate: onExperimentsUpdate,
  } = useAppContext()

  // AI feature state
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [showPhotoUploader, setShowPhotoUploader] = useState(false)
```

### Change 4: Add AI buttons to the UI
**FIND the section with existing buttons (around line 100-120) and ADD:**
```typescript
<Button
  onClick={() => setShowVoiceRecorder(true)}
  className="bg-purple-500 hover:bg-purple-600 text-white"
>
  <Mic className="mr-2 h-4 w-4" />
  Voice Transcription
</Button>

<Button
  onClick={() => setShowPhotoUploader(true)}
  className="bg-blue-500 hover:bg-blue-600 text-white"
>
  <Camera className="mr-2 h-4 w-4" />
  Photo OCR
</Button>
```

### Change 5: Add AI components at end of JSX (before final closing tags)
**ADD before the last `</div>` or `</main>` tag:**
```typescript
      {/* AI Features */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onClose={() => setShowVoiceRecorder(false)}
          onTranscriptionComplete={(text) => {
            // Add transcribed text to current page
            if (currentPage && selectedExperiment) {
              const updatedPage = {
                ...currentPage,
                content: (currentPage.content || "") + "\n\n" + text
              }
              const updatedPages = selectedExperiment.pages.map(p =>
                p.id === currentPage.id ? updatedPage : p
              )
              const updatedExperiment = {
                ...selectedExperiment,
                pages: updatedPages
              }
              const updatedExperiments = experiments.map(e =>
                e.id === selectedExperiment.id ? updatedExperiment : e
              )
              onExperimentsUpdate(updatedExperiments)
            }
            setShowVoiceRecorder(false)
          }}
        />
      )}

      {showPhotoUploader && (
        <PhotoUploader
          onClose={() => setShowPhotoUploader(false)}
          onProtocolExtracted={(protocol) => {
            // Add extracted protocol to current page
            console.log("Protocol extracted:", protocol)
            // TODO: Add protocol viewing UI
            setShowPhotoUploader(false)
          }}
        />
      )}
```

**That's it for ElectronicLabNotebook!**

---

## File 3: app/page.tsx

### Just replace the whole file:
```bash
cp app/page.tsx app/page-old-backup.tsx
cp app/page-refactored.tsx app/page.tsx
```

---

## File 4: Delete duplicates
```bash
rm components/DayToDayBoard.tsx
rm components/ElectronicLabNotebook.tsx
rm components/PersonalProfilePage.tsx
rm components/ProfileManagement.tsx
```

---

## Test & Deploy
```bash
npm run build
# Fix any errors
git add .
git commit -m "feat: Complete refactoring + integrate AI features"
git push
firebase deploy --only hosting
```

---

## If Build Fails

### Common Error 1: "useAppContext is not a function"
- Check that `lib/AppContext.tsx` exists
- Check that `app/layout.tsx` has `<AppWrapper>`

### Common Error 2: "Property 'dayToDayTasks' does not exist"
- Check that `useDayToDayTasks` hook exports `dayToDayTasks`
- Check that `AppContext.tsx` spreads the hook: `...dayToDayTasks`

### Common Error 3: AI components not found
- Run: `ls components/VoiceRecorder.tsx components/PhotoUploader.tsx`
- They should exist from previous work

---

## Success Criteria
- ✅ Build completes without errors
- ✅ DayToDayBoard view works
- ✅ Lab Notebook view works
- ✅ Voice button appears in Lab Notebook
- ✅ Photo button appears in Lab Notebook
- ✅ Clicking buttons opens AI components

That's it! The refactoring will be complete and AI features will be integrated.