import { getMembershipStatus } from '../lib/services/groupService'
import { ResearchGroup } from '../lib/types/researchgroup.types'

const baseGroup: ResearchGroup = {
  id: 'group-1',
  name: 'Test Group',
  description: 'A group used for membership tests',
  departmentId: 'dept-1',
  departmentName: 'Dept',
  schoolFacultyId: 'school-1',
  schoolFacultyName: 'School',
  organisationId: 'org-1',
  organisationName: 'Org',
  principalInvestigators: [],
  coordinatorIds: [],
  memberIds: ['user-admin'],
  memberCount: 1,
  adminIds: ['user-admin'],
  pendingMemberIds: ['user-pending'],
  workingLabIds: [],
  isPublic: true,
  allowSelfJoin: true,
  createdAt: new Date().toISOString(),
  createdBy: 'user-admin',
}

describe('getMembershipStatus', () => {
  it('returns admin + member status for admins', () => {
    const status = getMembershipStatus(baseGroup, 'user-admin')
    expect(status.isAdmin).toBe(true)
    expect(status.isMember).toBe(true)
    expect(status.isPending).toBe(false)
  })

  it('returns pending status for requests awaiting approval', () => {
    const status = getMembershipStatus(baseGroup, 'user-pending')
    expect(status.isPending).toBe(true)
    expect(status.isAdmin).toBe(false)
    expect(status.isMember).toBe(false)
  })

  it('returns clear status for non-members', () => {
    const status = getMembershipStatus(baseGroup, 'user-outside')
    expect(status).toEqual({
      isAdmin: false,
      isMember: false,
      isPending: false,
    })
  })
})
