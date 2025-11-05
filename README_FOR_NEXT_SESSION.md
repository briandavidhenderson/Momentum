# README for Next Session - Completing Refactoring & AI Integration

## Quick Summary
The codebase refactoring is **80% complete**. The infrastructure is ready, but view components need final updates to use the context, then AI features can be integrated.

## What Works Right Now
- ✅ All custom hooks created and working (`lib/hooks/`)
- ✅ AppContext provides centralized state (`lib/AppContext.tsx`)
- ✅ All AI components built and TypeScript-error-free
- ✅ Reference implementation exists (`app/page-refactored.tsx`)

## What Needs to Be Done
1. **Update 2 view components** to use `useAppContext()` instead of props
2. **Add AI buttons** to ElectronicLabNotebook
3. **Replace page.tsx** with the refactored version
4. **Delete duplicates** and test

## Critical Files to Read First
1. **`CURRENT_STATUS_AND_NEXT_STEPS.md`** - Complete status and step-by-step guide
2. **`REFACTORING_COMPLETION_PLAN.md`** - Detailed architectural plan
3. **`app/page-refactored.tsx`** - Shows the correct pattern (200 lines vs 2,613)

## The Pattern You Need to Apply

### ❌ Current (Wrong - Props-Based)
```typescript
// components/views/DayToDayBoard.tsx
interface DayToDayBoardProps {
  tasks: DayToDayTask[]
  people: Person[]
  onCreateTask: (...) => void
  onUpdateTask: (...) => void
  // ... 20 more props
}

export function DayToDayBoard({ tasks, people, onCreateTask, ... }: DayToDayBoardProps) {
  // Component uses props
}
```

### ✅ Correct (Context-Based)
```typescript
// components/views/DayToDayBoard.tsx
import { useAppContext } from "@/lib/AppContext"

export function DayToDayBoard() {
  // Get everything from context instead of props
  const {
    dayToDayTasks,
    people,
    handleCreateDayToDayTask,
    handleUpdateDayToDayTask,
    handleDeleteDayToDayTask,
    handleMoveDayToDayTask
  } = useAppContext()

  // Now use context values directly
  return <div>{/* ... */}</div>
}
```

## Step-by-Step (Estimated 2 hours)

### Step 1: Fix DayToDayBoard (30 mins)
```bash
# Open the file
code components/views/DayToDayBoard.tsx

# Apply the pattern above:
# 1. Import useAppContext
# 2. Remove props interface
# 3. Destructure from context
# 4. Replace all prop usage with context values
```

### Step 2: Fix ElectronicLabNotebook + Add AI (45 mins)
```bash
# Open the file
code components/views/ElectronicLabNotebook.tsx

# Same pattern as Step 1, then add:
import { VoiceRecorder } from "@/components/VoiceRecorder"
import { PhotoUploader } from "@/components/PhotoUploader"
import { AIProtocolViewer } from "@/components/AIProtocolViewer"

# Add buttons to UI:
<Button onClick={() => setShowVoiceRecorder(true)}>
  <Mic className="mr-2" />
  Voice Transcription
</Button>

<Button onClick={() => setShowPhotoUploader(true)}>
  <Camera className="mr-2" />
  Photo OCR
</Button>

# Render components when buttons clicked
```

### Step 3: Replace page.tsx (15 mins)
```bash
# Backup old version
cp app/page.tsx app/page-old-backup.tsx

# Use new clean version
cp app/page-refactored.tsx app/page.tsx

# Test
npm run build
```

### Step 4: Delete Duplicates (5 mins)
```bash
rm components/DayToDayBoard.tsx
rm components/ElectronicLabNotebook.tsx
rm components/PersonalProfilePage.tsx
rm components/ProfileManagement.tsx
```

### Step 5: Test & Deploy (30 mins)
```bash
# Test build
npm run build

# If errors, fix them (likely just import paths)
# If success, deploy
git add .
git commit -m "feat: Refactor God Component + integrate AI features

- Split 4,332-line page.tsx into modular views
- Add custom hooks for state management
- Integrate AI features: voice transcription, photo OCR
- Add VoiceRecorder and PhotoUploader to ELN
- Reduce page.tsx to 200 lines
- Delete duplicate components"

git push origin main
firebase deploy --only hosting
```

## If You Get Stuck

### Issue: Build Errors After Changes
**Solution**: Check these common issues:
1. Import paths - make sure `@/lib/AppContext` is correct
2. Missing exports from AppContext - check `lib/AppContext.tsx` exports what you need
3. Type mismatches - check hook return types in `lib/hooks/`

### Issue: AI Components Not Showing
**Solution**:
1. Make sure imports are correct
2. Check that state variables are defined (e.g., `const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)`)
3. Verify conditional rendering: `{showVoiceRecorder && <VoiceRecorder ... />}`

### Issue: Context is Undefined
**Solution**:
1. Verify `AppWrapper` is in `app/layout.tsx`
2. Make sure you're calling `useAppContext()` inside a component, not at module level
3. Check that the hook you need is actually exported from the relevant custom hook

## Architecture Rules Going Forward

### ❌ Never Do This Again
1. Don't create components over 500 lines
2. Don't pass 50+ props down multiple levels
3. Don't put business logic in UI components
4. Don't duplicate components across directories

### ✅ Always Do This
1. Extract logic into custom hooks (`lib/hooks/`)
2. Use context for shared state
3. Keep view components in `components/views/`
4. One concern per file
5. Document as you go

## Key Architectural Decisions

### Why Custom Hooks?
- Reusable logic across components
- Easy to test
- Clear separation of concerns

### Why Context vs Zustand?
- Context is built-in (no extra dependency)
- Simple to understand
- Good enough for this app size
- Can migrate to Zustand later if needed

### Why Separate View Components?
- Easier to find code
- Easier to test individual views
- Can lazy-load views later for performance
- Clear mental model of app structure

## Success Metrics
- [ ] `app/page.tsx` < 300 lines
- [ ] No duplicate components
- [ ] AI features working (voice + photo)
- [ ] Build completes without errors
- [ ] All views render correctly
- [ ] Deployed to production

## Resources
- **OpenAI API Key**: Needed for AI features - add to Firebase Console Environment Variables
- **Firestore Rules**: Already configured for lab-based data isolation
- **Firebase Hosting**: Already set up, just run `firebase deploy`

## Expected Final File Structure
```
app/
  page.tsx (200 lines) ✅
  layout.tsx ✅

components/
  views/
    ProjectDashboard.tsx ✅
    DayToDayBoard.tsx (needs context update)
    ElectronicLabNotebook.tsx (needs context update + AI)
    PeopleView.tsx ✅
    PersonalProfilePage.tsx ✅
    ProfileManagement.tsx ✅

  VoiceRecorder.tsx ✅
  PhotoUploader.tsx ✅
  AIProtocolViewer.tsx ✅
  ConfidenceHighlighter.tsx ✅

lib/
  hooks/
    useAuth.ts ✅
    useProjects.ts ✅
    useELN.ts ✅
    ... (all hooks) ✅

  ai/
    types.ts ✅
    router.ts ✅
    prompts.ts ✅
    providers/
      openai.ts ✅

  AppContext.tsx ✅
```

## Next Command to Run
```bash
# Start here
code CURRENT_STATUS_AND_NEXT_STEPS.md
```

Then follow the step-by-step guide!

---

**Estimated Time to Complete**: 2 hours
**Current Progress**: 80% done
**Remaining Work**: Update 2 components, add AI buttons, test & deploy

You've got this! 🚀