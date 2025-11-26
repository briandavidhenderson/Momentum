import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { UnitOperation } from "@/lib/protocol/types";

export interface Shape {
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    fill: string
    stroke: string
    strokeWidth: number
    text?: string
    assetType?: string
    rotation?: number
    groupId?: string
    locked?: boolean
    textAlign?: 'left' | 'center' | 'right'
    textAlignVertical?: 'top' | 'middle' | 'bottom'
    textBold?: boolean
    textItalic?: boolean
    textUnderline?: boolean
    fontSize?: number
    lineStartMarker?: 'none' | 'arrow' | 'circle'
    lineEndMarker?: 'none' | 'arrow' | 'circle'
    lineStyle?: 'solid' | 'dashed' | 'dotted'
    linkedEntityType?: 'inventory' | 'equipment'
    linkedEntityId?: string
    protocolData?: UnitOperation
    fromNodeId?: string  // protocol_node ID arrow starts from
    toNodeId?: string    // protocol_node ID arrow points to
    isAutoConnected?: boolean  // true if auto-detected vs manually set
    parallelGroupId?: string  // ID of parallel group this protocol node belongs to
}

export interface WhiteboardData {
    id?: string;
    name: string;
    shapes: Shape[];
    createdAt?: any;
    updatedAt?: any;
    createdBy: string;
    labId: string;
}

const COLLECTION_NAME = "whiteboards";

export const createWhiteboard = async (data: Omit<WhiteboardData, "id" | "createdAt" | "updatedAt">): Promise<string> => {
    try {
        const db = getFirebaseDb();
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        logger.error("Error creating whiteboard", error);
        throw error;
    }
};

export const updateWhiteboard = async (id: string, updates: Partial<WhiteboardData>) => {
    try {
        const db = getFirebaseDb();
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        logger.error("Error updating whiteboard", error);
        throw error;
    }
};

export const getWhiteboard = async (id: string): Promise<WhiteboardData | null> => {
    try {
        const db = getFirebaseDb();
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as WhiteboardData;
        }
        return null;
    } catch (error) {
        logger.error("Error getting whiteboard", error);
        throw error;
    }
};

export const getWhiteboardsForLab = async (labId: string): Promise<WhiteboardData[]> => {
    try {
        const db = getFirebaseDb();
        const q = query(collection(db, COLLECTION_NAME), where("labId", "==", labId || ""));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhiteboardData));
    } catch (error) {
        logger.error("Error getting whiteboards for lab", error);
        throw error;
    }
};

export const deleteWhiteboard = async (id: string) => {
    try {
        const db = getFirebaseDb();
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        logger.error("Error deleting whiteboard", error);
        throw error;
    }
};

export const subscribeToWhiteboards = (
    labId: string,
    callback: (whiteboards: WhiteboardData[]) => void
): (() => void) => {
    try {
        const db = getFirebaseDb();
        const q = query(collection(db, COLLECTION_NAME), where("labId", "==", labId || ""));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const whiteboards = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as WhiteboardData));
            callback(whiteboards);
        }, (error) => {
            logger.error("Error subscribing to whiteboards", error);
        });

        return unsubscribe;
    } catch (error) {
        logger.error("Error setting up whiteboard subscription", error);
        throw error;
    }
};
