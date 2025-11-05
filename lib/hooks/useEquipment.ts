
import { useState, useEffect } from 'react';
import { EquipmentDevice } from '@/lib/types';
import { subscribeToEquipment, createEquipment, updateEquipment } from '@/lib/firestoreService';

export function useEquipment(currentUserProfile: any) {
  const [equipment, setEquipment] = useState<EquipmentDevice[]>([]);

  useEffect(() => {
    if (!currentUserProfile || !currentUserProfile.lab) return;

    const unsubscribe = subscribeToEquipment(currentUserProfile.lab, (equipment) => {
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
