
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { EquipmentDevice } from '@/lib/types';
import { subscribeToEquipment, createEquipment, updateEquipment } from '@/lib/firestoreService';

export function useEquipment() {
  const { currentUserProfile: profile } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentDevice[]>([]);

  useEffect(() => {
    if (!profile?.labId) return;

    const unsubscribe = subscribeToEquipment(profile.labId, (equipment) => {
      setEquipment(equipment);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCreateEquipment = async (equipmentData: Omit<EquipmentDevice, 'id'>) => {
    if (!profile) return;
    await createEquipment({ ...equipmentData, labId: profile.labId });
  };

  const handleUpdateEquipment = async (equipmentId: string, updates: Partial<EquipmentDevice>) => {
    await updateEquipment(equipmentId, updates);
  };

  return {
    equipment,
    handleCreateEquipment,
    handleUpdateEquipment,
  };
}
