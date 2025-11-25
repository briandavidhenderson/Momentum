# Groups UI (unfinished integration)

This folder contains a full set of React components for viewing, creating, and managing research groups plus their physical labs. They are not mounted anywhere in the app yet.

## Current building blocks
- `GroupList` loads groups for the current user’s lab via `getResearchGroups`, lets you create a group (`GroupCreateDialog`), shows membership status via `getMembershipStatus`, and drills into `GroupDetail`.
- `GroupDetail` refreshes a group via `getResearchGroup`, exposes join/leave + admin actions (`JoinGroupButton`, `GroupMembershipPanel`), and shows labs (`WorkingLabList`).
- `GroupMembershipPanel` renders admins, members, and pending requests with approve/reject/remove callbacks.
- `WorkingLabList` fetches labs for a group (`getWorkingLabs`) and adds new ones through `WorkingLabCreateDialog`.
- `GroupCreateDialog` and `WorkingLabCreateDialog` build the Firestore payloads expected by `groupService` using the current user profile (hierarchy + creator metadata).

## Integration strategy
1) **Mount a route:** Create `app/groups/page.tsx` (or similar entry) that renders `<GroupList />`. Ensure it is wrapped in the provider that supplies `useAppContext` (`currentUserProfile`, `allProfiles`).
2) **Navigation entry:** Add a sidebar/header link to the new route so users can reach it. Gate the link based on authentication if needed.
3) **Context/data readiness:** Confirm `currentUserProfile` includes lab/department identifiers (`labId`, names, org/school ids) since creation flows rely on them; handle loading/empty profile states before calling `GroupList`.
4) **Error/loading UX:** Add toasts/error boundaries around `GroupList` and `GroupDetail` actions (join/leave/approve/reject/remove, lab creation) so failures aren’t silent.
5) **Permissions alignment:** Enforce admin-only actions on the backend (Firestore rules/functions) to match the client checks in `GroupMembershipPanel` and `groupService`.
6) **Testing pass:** Manually verify flows (create group, join request, approve/reject, leave, add lab) against Firestore; add a small integration test stub if your test setup supports mocking `groupService`.
