"use client";

import React, { useState } from 'react';
import { ResearchBoardsList } from './research/ResearchBoardsList';
import ResearchBoardDetail from './research/ResearchBoardDetail';

export default function ResearchBoard() {
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

    if (selectedBoardId) {
        return (
            <ResearchBoardDetail
                boardId={selectedBoardId}
                onBack={() => setSelectedBoardId(null)}
            />
        );
    }

    return (
        <ResearchBoardsList
            onSelectBoard={setSelectedBoardId}
        />
    );
}
