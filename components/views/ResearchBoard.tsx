"use client";

import React, { useState, useEffect } from 'react';
import { ResearchBoardsList } from './research/ResearchBoardsList';
import ResearchBoardDetail from './research/ResearchBoardDetail';

export default function ResearchBoard() {
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

    // Handle browser back button
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state?.boardId) {
                setSelectedBoardId(event.state.boardId)
            } else {
                setSelectedBoardId(null)
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [])

    const handleSelectBoard = (boardId: string) => {
        setSelectedBoardId(boardId)
        window.history.pushState({ boardId }, '', `#research-board=${boardId}`)
    }

    const handleBack = () => {
        window.history.back()
    }

    if (selectedBoardId) {
        return (
            <ResearchBoardDetail
                boardId={selectedBoardId}
                onBack={handleBack}
            />
        );
    }

    return (
        <ResearchBoardsList
            onSelectBoard={handleSelectBoard}
        />
    );
}
