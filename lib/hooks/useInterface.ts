
import { useState } from 'react';

export function useInterface() {
  const [activeTab, setActiveTab] = useState('projects');
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);

  return {
    activeTab,
    setActiveTab,
    isProjectModalOpen,
    setProjectModalOpen,
    isTaskModalOpen,
    setTaskModalOpen,
  };
}
