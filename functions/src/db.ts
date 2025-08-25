import {
  getFirestore,
  CollectionReference,
  DocumentData,
} from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  // Prevent re-initialization in hot-reloaded environments
  initializeApp(); // This will initialize the default app
}

export const db = getFirestore(); // Call getFirestore() directly

interface Flyovers {
  hex: string;
  flyover_count?: number;
  seen_at?: number; // Or Date, depending on how you store it
  last_flyover_ended_at?: number; // Or Date, depending on how you store it
  flyover_started_at?: number; // Or Date, depending on how you store it
  aircraft?: string;
}

interface Record {
  hex: string;
  aircraft: {
    type: string;
    manufacturer: string;
  };
}

const getMyDataCollection = (): CollectionReference<Flyovers> => {
  return db.collection('flyovers') as CollectionReference<Flyovers>;
};

/**
 * Records a flyover event in the Firestore 'flyovers' collection.
 * @param {Record} record - The flyover data to record.
 * @return {Promise<string>} The ID of the newly created document.
 */
export async function recordFlyover(record: Record): Promise<string> {
  // The 'hex' field from your item is the unique value we're checking
  const hexValue = record.hex;
  const FLYOVER_TIMEOUT = 5 * 60 * 1000;
  const item = {} as Flyovers;
  item.hex = hexValue;

  // Basic validation to ensure the hex field is present
  if (!hexValue) {
    throw new Error('The "hex" identifier is missing from the flyover item.');
  }

  try {
    const docId = await db.runTransaction(async (transaction) => {
      const flyoverCollectionRef = getMyDataCollection();

      const querySnapshot = await transaction.get(
        flyoverCollectionRef.where('hex', '==', hexValue)
      );

      let targetDocRef;
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        targetDocRef = existingDoc.ref;
        const seenAt = existingDoc.data().seen_at;
        if (
          typeof seenAt === 'number' &&
          Date.now() - seenAt > FLYOVER_TIMEOUT
        ) {
          console.log(
            `Flyover with hex '${hexValue}' already exists.
          Updating document: ${targetDocRef.id} (adding 1 new flyover)`
          );
          item.flyover_count = (existingDoc.data().flyover_count ?? 0) + 1;
          item.flyover_started_at = Date.now();
          item.seen_at = Date.now();
          item.last_flyover_ended_at = seenAt;
          // prettier-ignore
          item.aircraft = record.aircraft?.manufacturer ?
            `${record.aircraft.manufacturer} ${record.aircraft.type}` :
            'unknown aircraft';
          transaction.update(targetDocRef, item as DocumentData);
        } else {
          console.log(
            `Flyover with hex '${hexValue}' already exists.
          and has been seen very recently ${targetDocRef.id}
          so just updating the seen_at timestamp`
          );
          // If the existing flyover is still valid, we do not create a new one}
          item.flyover_count = existingDoc.data().flyover_count;
          item.flyover_started_at =
            existingDoc.data().flyover_started_at ?? Date.now();
          item.seen_at = Date.now();
          item.last_flyover_ended_at =
            existingDoc.data().last_flyover_ended_at ?? 0;
          transaction.update(targetDocRef, item as DocumentData);
        }
      } else {
        targetDocRef = flyoverCollectionRef.doc();
        console.log(
          `No flyover with hex '${hexValue}' found.
          Creating new document: ${targetDocRef.id}`
        );
        item.flyover_count = 1;
        item.seen_at = Date.now();
        item.flyover_started_at = Date.now();
        item.last_flyover_ended_at = 0;
        // prettier-ignore
        item.aircraft = record.aircraft?.manufacturer ?
          `${record.aircraft?.manufacturer} ${record.aircraft?.type}` :
          'unknown aircraft';
        // Set the entire item (which includes 'hex') as the document content
        transaction.set(targetDocRef, item);
      }

      return targetDocRef.id;
    });

    // Logging for the successful operation path
    console.log(
      `Operation completed for hex '${hexValue}'. Document ID: ${docId}`
    );
    return docId;
  } catch (e: any) {
    // Logging for error path (e.g., transaction failure, network issues)
    console.error(`Error processing flyover for hex '${hexValue}': `, e);
    throw e; // Re-throw the error for handling in the calling Firebase Function
  }
}

/**
 * Retrieves the flyover count for a given hex identifier from Firestore.
 *
 * @param {string} hex The unique hex identifier of the flyover document.
 * @return {Promise<number>} A Promise that resolves to the flyover count.
 */
export async function getFlyoverCount(hex: string): Promise<number> {
  try {
    const querySnapshot = await getMyDataCollection()
      .where('hex', '==', hex)
      .limit(1) // We expect only one, so limit to 1 for efficiency
      .get();

    // Check if any document was found
    if (!querySnapshot.empty) {
      const flyoverData = querySnapshot.docs[0].data();
      // Return the flyover_count, or 0 if it's undefined/null for some reason
      return flyoverData.flyover_count || 0;
    } else {
      // No document found with the given hex, return 0 as the count
      return 0;
    }
  } catch (e) {
    console.error(`Error getting flyover count for hex '${hex}': `, e);
    throw e;
  }
}

/**
 * Retrieves the flyover count for a given hex identifier from Firestore.
 *
 * @param {string} hex The unique hex identifier of the flyover document.
 * @return {Promise<number>} A Promise that resolves to the flyover count.
 */
export async function getLastFlyoverEndedAt(hex: string): Promise<number> {
  try {
    const querySnapshot = await getMyDataCollection()
      .where('hex', '==', hex)
      .limit(1) // We expect only one, so limit to 1 for efficiency
      .get();

    // Check if any document was found
    if (!querySnapshot.empty) {
      const flyoverData = querySnapshot.docs[0].data();
      // Return the last_flyover_ended_at, or 0 if it's undefined/null
      return flyoverData.last_flyover_ended_at || 0;
    } else {
      // No document found with the given hex, return 0 as the count
      return 0;
    }
  } catch (e) {
    console.error(`Error getting last flyover ended at for hex '${hex}': `, e);
    throw e;
  }
}
