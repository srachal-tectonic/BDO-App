/**
 * Client-side database shim
 * TODO: Replace with Azure Cosmos DB client SDK
 *
 * This module provides stub implementations of database functions
 * so that components can compile without a database SDK installed.
 *
 * All operations use in-memory storage or return empty data.
 */

// In-memory store for dev mode -- data persists for the browser session only.
const devStore = new Map<string, any>();

// Re-export the db proxy from the auth stub
export { db } from '@/lib/firebase';

// Stub database functions that return empty data instead of throwing,
// so pages like Admin Settings can load during early development.
export const doc = (..._args: any[]): any => {
  const path = _args.filter((a) => typeof a === 'string').join('/');
  return { id: path.split('/').pop() || '', path };
};

export const getDoc = async (ref: any): Promise<any> => {
  const data = devStore.get(ref.path);
  return {
    exists: () => data !== undefined,
    data: () => data ?? null,
    id: ref.id,
  };
};

export const getDocs = async (..._args: any[]): Promise<any> => {
  // Return an empty collection snapshot
  return { docs: [], empty: true, size: 0 };
};

export const setDoc = async (ref: any, data: any, _options?: any): Promise<void> => {
  const existing = _options?.merge ? devStore.get(ref.path) || {} : {};
  devStore.set(ref.path, { ...existing, ...data });
  console.info(`[dev db] setDoc ${ref.path}`);
};

export const deleteDoc = async (ref: any): Promise<void> => {
  devStore.delete(ref.path);
  console.info(`[dev db] deleteDoc ${ref.path}`);
};

export const updateDoc = async (ref: any, data: any): Promise<void> => {
  const existing = devStore.get(ref.path) || {};
  devStore.set(ref.path, { ...existing, ...data });
  console.info(`[dev db] updateDoc ${ref.path}`);
};

export const collection = (..._args: any[]): any => ({});
export const query = (..._args: any[]): any => ({});
export const where = (..._args: any[]): any => ({});
export const orderBy = (..._args: any[]): any => ({});

export class Timestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  toDate(): Date {
    return new Date(this.seconds * 1000);
  }
  static now(): Timestamp {
    const now = Date.now();
    return new Timestamp(Math.floor(now / 1000), (now % 1000) * 1e6);
  }
  static fromDate(date: Date): Timestamp {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
}
