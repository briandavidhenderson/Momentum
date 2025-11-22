/**
 * Enable booking settings on all equipment
 * Run this script to enable booking functionality on existing equipment
 * 
 * NOTE: This is a one-time migration script. It may have already been executed.
 * Check your equipment documents to see if booking is already enabled before running.
 */

import { getFirebaseDb } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function enableBookingOnAllEquipment() {
  const db = getFirebaseDb();
  const equipmentRef = collection(db, 'equipment');

  try {
    const snapshot = await getDocs(equipmentRef);
    console.log(`Found ${snapshot.size} equipment items`);

    let updated = 0;
    for (const equipmentDoc of snapshot.docs) {
      const data = equipmentDoc.data();

      // Check if booking is already enabled
      if (data.bookingSettings?.bookingEnabled) {
        console.log(`✓ ${data.name}: Booking already enabled`);
        continue;
      }

      // Enable booking with default settings
      await updateDoc(doc(db, 'equipment', equipmentDoc.id), {
        bookingSettings: {
          bookingEnabled: true,
          requireApproval: false,
          maxBookingDuration: 480, // 8 hours in minutes
          minBookingDuration: 30,   // 30 minutes
          advanceBookingDays: 30,   // Can book up to 30 days in advance
          allowRecurring: true,
        }
      });

      console.log(`✓ ${data.name}: Booking enabled`);
      updated++;
    }

    console.log(`\n✅ Successfully enabled booking on ${updated} equipment items`);
  } catch (error) {
    console.error('Error enabling booking:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  enableBookingOnAllEquipment()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

export { enableBookingOnAllEquipment };
