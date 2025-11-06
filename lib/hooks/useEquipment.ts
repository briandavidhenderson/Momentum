
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { EquipmentDevice } from '@/lib/types';
import { subscribeToEquipment, createEquipment, updateEquipment } from '@/lib/firestoreService';

export function useEquipment() {
  const { currentUserProfile } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentDevice[]>([]);

  useEffect(() => {
    if (!currentUserProfile || !currentUserProfile.labId) return;

    const unsubscribe = subscribeToEquipment(currentUserProfile.labId, (equipment) => {
      setEquipment(equipment);
    });

    return () => unsubscribe();
  }, [currentUserProfile]);

  const handleEquipmentUpdate = async (updatedEquipment: EquipmentDevice) => {
    if (updatedEquipment.id) {
      await updateEquipment(updatedEquipment.id, updatedEquipment);
    } else {
      await createEquipment(updatedEquipment);
    }
  };

  return {
    equipment,
    handleEquipmentUpdate,
  };
}
