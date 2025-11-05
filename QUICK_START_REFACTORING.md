# Quick Start: Complete the Refactoring

## TL;DR
2 files need updating, then AI features can be added. ~2 hours of work.

## Files to Edit

### 1. `components/views/DayToDayBoard.tsx`
**Change this:**
```typescript
interface DayToDayBoardProps {
  tasks: DayToDayTask[]
  people: Person[]
  onCreateTask: (...) => void
  onUpdateTask: (...) => void
  onDeleteTask: (...) => void
  onMoveTask: (...) => void
}

export function DayToDayBoard({
  tasks,
  people,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask
}: DayToDayBoardProps) {
```

**To this:**
```typescript
import { useAppContext } from "@/lib/AppContext"

export function DayToDayBoard() {
  const {
    dayToDayTasks: tasks,
    people,
    handleCreateDayToDayTask: onCreateTask,
    handleUpdateDayToDayTask: onUpdateTask,
    handleDeleteDayToDayTask: onDeleteTask,
    handleMoveDayToDayTask: onMoveTask
  } = useAppContext()
```

### 2. `components/views/ElectronicLabNotebook.tsx`
**Same pattern, then add AI:**

```typescript
import { useAppContext } from "@/lib/AppContext"
import { VoiceRecorder } from "@/components/VoiceRecorder"
import { PhotoUploader } from "@/components/PhotoUploader"
import { AIProtocolViewer } from "@/components/AIProtocolViewer"

export function ElectronicLabNotebook() {
  const {
    elnExperiments: experiments,
    currentUserProfile,
    handleExperimentsUpdate: onExperimentsUpdate
  } = useAppContext()

  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [showPhotoUploader, setShowPhotoUploader] = useState(false)

  // Add buttons in the UI:
  return (
    <div>
      {/* Existing UI */}

      {/* New AI buttons */}
      <Button onClick={() => setShowVoiceRecorder(true)}>
        <Mic /> Voice Transcription
      </Button>

      <Button onClick={() => setShowPhotoUploader(true)}>
        <Camera /> Photo OCR
      </Button>

      {/* AI components */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onClose={() => setShowVoiceRecorder(false)}
          onTranscriptionComplete={(text) => {
            // Add to current page
            console.log('Transcribed:', text)
          }}
        />
      )}

      {showPhotoUploader && (
        <PhotoUploader
          onClose={() => setShowPhotoUploader(false)}
          onProtocolExtracted={(protocol) => {
            // Add to current page
            console.log('Extracted protocol:', protocol)
          }}
        />
      )}
    </div>
  )
}
```

### 3. Replace `app/page.tsx`
```bash
cp app/page.tsx app/page-old-backup.tsx
cp app/page-refactored.tsx app/page.tsx
```

### 4. Delete Duplicates
```bash
rm components/DayToDayBoard.tsx
rm components/ElectronicLabNotebook.tsx
rm components/PersonalProfilePage.tsx
rm components/ProfileManagement.tsx
```

### 5. Test & Deploy
```bash
npm run build
# Fix any errors
git add .
git commit -m "feat: Complete refactoring + add AI features"
git push
firebase deploy --only hosting
```

## If You Need Help
- Read `CURRENT_STATUS_AND_NEXT_STEPS.md` for detailed explanation
- Look at `app/page-refactored.tsx` for reference implementation
- Check `lib/AppContext.tsx` to see what's available in context

## That's It!
The hard part (infrastructure) is done. Just update those 2 files and you're ready to deploy.