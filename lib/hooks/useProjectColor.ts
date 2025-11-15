/**
 * useProjectColor Hook
 *
 * Manages the active project color theme throughout the application.
 * Applies CSS variables to the DOM for dynamic theming.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ColorPalette,
  generateColorPalette,
  applyColorPaletteToDOM,
  removeColorPaletteFromDOM
} from '../colors'

export function useProjectColor() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeProjectColor, setActiveProjectColor] = useState<string | null>(null)
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null)

  // Apply color palette to DOM when active project color changes
  useEffect(() => {
    if (activeProjectColor) {
      const palette = generateColorPalette(activeProjectColor)
      applyColorPaletteToDOM(palette, 'project')

      // Also apply as 'active' for convenience
      applyColorPaletteToDOM(palette, 'active')
    } else {
      removeColorPaletteFromDOM('project')
      removeColorPaletteFromDOM('active')
    }

    // Cleanup on unmount
    return () => {
      removeColorPaletteFromDOM('project')
      removeColorPaletteFromDOM('active')
    }
  }, [activeProjectColor])

  /**
   * Set the active project and its color
   * This will theme the entire app with the project's color
   */
  const setActiveProject = useCallback((projectId: string | null, projectColor: string | null) => {
    setActiveProjectId(projectId)
    setActiveProjectColor(projectColor)
  }, [])

  /**
   * Clear the active project theme
   */
  const clearActiveProject = useCallback(() => {
    setActiveProjectId(null)
    setActiveProjectColor(null)
  }, [])

  /**
   * Set the highlighted person (for hover-to-highlight feature)
   */
  const setHighlightedPerson = useCallback((personId: string | null) => {
    setHighlightedPersonId(personId)
  }, [])

  /**
   * Get the current active color palette
   */
  const getActivePalette = useCallback((): ColorPalette | null => {
    if (!activeProjectColor) return null
    return generateColorPalette(activeProjectColor)
  }, [activeProjectColor])

  return {
    activeProjectId,
    activeProjectColor,
    highlightedPersonId,
    setActiveProject,
    clearActiveProject,
    setHighlightedPerson,
    getActivePalette,
  }
}
