import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { useToast } from '../toast'
import { logger } from '../logger'
import type { CreateResearchPinInput, ResearchPin, UpdateResearchPinInput } from '../types'
import {
  createResearchPin,
  deleteResearchPin,
  subscribeToResearchPins,
  updateResearchPin,
} from '../services/researchService'

export function useResearchBoard() {
  const { currentUser, currentUserProfile } = useAuth()
  const { error } = useToast()
  const [pins, setPins] = useState<ResearchPin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!currentUserProfile?.labId || !currentUser?.uid) return

    const unsubscribe = subscribeToResearchPins(
      { labId: currentUserProfile.labId, userId: currentUser.uid },
      (nextPins) => {
        setPins(nextPins)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [currentUser?.uid, currentUserProfile?.labId])

  const filteredPins = useMemo(() => {
    if (!searchQuery.trim()) return pins

    const query = searchQuery.toLowerCase()
    return pins.filter((pin) => {
      return (
        pin.title?.toLowerCase().includes(query) ||
        pin.content?.toLowerCase().includes(query) ||
        pin.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    })
  }, [pins, searchQuery])

  const createPin = async (pin: CreateResearchPinInput): Promise<string | null> => {
    try {
      return await createResearchPin(pin)
    } catch (err) {
      logger.error('Error creating research pin', err)
      error('Failed to create research pin')
      return null
    }
  }

  const updatePin = async (pinId: string, updates: UpdateResearchPinInput) => {
    try {
      await updateResearchPin(pinId, updates)
    } catch (err) {
      logger.error('Error updating research pin', err)
      error('Failed to update research pin')
    }
  }

  const deletePin = async (pinId: string) => {
    try {
      await deleteResearchPin(pinId)
    } catch (err) {
      logger.error('Error deleting research pin', err)
      error('Failed to delete research pin')
    }
  }

  return {
    pins: filteredPins,
    loading,
    searchQuery,
    setSearchQuery,
    createPin,
    updatePin,
    deletePin,
  }
}
