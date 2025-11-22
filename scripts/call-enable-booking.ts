/**
 * Call the Firebase Function to enable booking on all equipment
 * 
 * NOTE: This is a one-time migration script. It may have already been executed.
 * Check your equipment documents to see if booking is already enabled before running.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../lib/firebase';

async function callEnableBooking() {
  try {
    const functions = getFunctions(app);
    const enableBooking = httpsCallable(functions, 'enableEquipmentBooking');

    console.log('Calling enableEquipmentBooking function...');
    const result = await enableBooking();

    console.log('✅ Success!');
    console.log(result.data);
  } catch (error) {
    console.error('❌ Error calling function:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  callEnableBooking()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

export { callEnableBooking };
