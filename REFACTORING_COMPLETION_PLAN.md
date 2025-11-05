# Refactoring Completion Plan

## Current Status
- ✅ Custom hooks created in `lib/hooks/`
- ✅ AppContext created in `lib/AppContext.tsx`
- ✅ AppWrapper integrated into `app/layout.tsx`
- ⚠️ View components created but use prop-passing instead of context
- ⚠️ `app/page.tsx` still has 2,613 lines (was 4,332)
- ⚠️ Duplicate components exist in both `components/` and `components/views/`

## Remaining Work

### Phase 1: Fix View Components to Use Context (PRIORITY)
All view components in `components/views/` need to be updated to:
1. Import `useAppContext` hook
2. Destructure needed state/handlers from context
3. Remove props interface
4. Use context values directly

Files to update:
- `components/views/ProjectDashboard.tsx` - Currently expects 100+ props
- `components/views/DayToDayBoard.tsx` - Currently expects props
- `components/views/ElectronicLabNotebook.tsx` - Currently expects props
- `components/views/PeopleView.tsx` - Check if using context
- `components/views/PersonalProfilePage.tsx` - Check if using context
- `components/views/ProfileManagement.tsx` - Check if using context

### Phase 2: Replace app/page.tsx
Once view components use context:
1. Backup current `app/page.tsx` to `app/page-old-backup.tsx`
2. Copy `app/page-refactored.tsx` to `app/page.tsx`
3. Test that application loads
4. Fix any import/compilation errors

### Phase 3: Delete Duplicate Components
After confirming new architecture works, delete old components:
- `components/DayToDayBoard.tsx`
- `components/ElectronicLabNotebook.tsx`
- `components/PersonalProfilePage.tsx`
- `components/ProfileManagement.tsx`
- `components/PeopleView.tsx` (if duplicate exists)

### Phase 4: Integrate AI Features
**This is the original goal - now much easier with clean architecture!**

1. Update `components/views/ElectronicLabNotebook.tsx` to import AI components:
   ```typescript
   import { VoiceRecorder } from "@/components/VoiceRecorder"
   import { PhotoUploader } from "@/components/PhotoUploader"
   import { AIProtocolViewer } from "@/components/AIProtocolViewer"
   import { ConfidenceHighlighter } from "@/components/ConfidenceHighlighter"
   ```

2. Add UI buttons for AI features:
   - Voice transcription button (uses VoiceRecorder)
   - Photo upload button (uses PhotoUploader)
   - Protocol viewer panel (uses AIProtocolViewer)

3. Wire up AI state management:
   - Add AI-specific state to `lib/hooks/useELN.ts`
   - Handle voice transcription results
   - Handle photo OCR results
   - Store AI-generated protocols

### Phase 5: Testing
1. Run `npm run build` to check for TypeScript errors
2. Test each view:
   - Projects dashboard
   - People view
   - Day-to-day board
   - **Lab notebook with AI features** ⭐
   - Profile management
3. Test AI features:
   - Voice recording and transcription
   - Photo upload and OCR
   - Protocol extraction

### Phase 6: Deployment
1. Commit all changes with clear message
2. Push to main
3. Deploy to Firebase
4. Verify on live site

## Architecture Rules for Future (Prevent Bloat)

### Rule 1: One Concern Per File
- ❌ Never put multiple features in one file
- ✅ Separate files for each feature domain

### Rule 2: Context Over Props
- ❌ Don't pass state through 5+ layers of props
- ✅ Use context or state management library

### Rule 3: Custom Hooks for Logic
- ❌ Don't put business logic in components
- ✅ Extract to custom hooks (useProjects, useOrders, etc.)

### Rule 4: Component Size Limit
- ❌ If a component exceeds 500 lines, refactor
- ✅ Break into smaller, focused components

### Rule 5: View Components
- ❌ Don't duplicate view logic across files
- ✅ One component per major view in `components/views/`

## Success Criteria
- [ ] `app/page.tsx` under 300 lines
- [ ] All view components use `useAppContext()`
- [ ] No duplicate components
- [ ] AI features integrated and working
- [ ] Build completes without errors
- [ ] Application works on live site