import { useState, useEffect } from 'react';
import { PersonProfile } from '@/lib/types';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/logger';

export function useRealProfiles() {
    const [profiles, setProfiles] = useState<PersonProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const db = getFirebaseDb();
                const profilesRef = collection(db, 'personProfiles');
                const snapshot = await getDocs(profilesRef);

                const profilesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as PersonProfile[];

                setProfiles(profilesData);
            } catch (error) {
                logger.error("Failed to fetch profiles for network view", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return { profiles, loading };
}
