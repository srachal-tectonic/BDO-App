// TODO: Implement with Azure equivalents (Azure Cosmos DB, Azure Blob Storage, Microsoft Entra ID)
// This file provides stub exports to prevent import errors.

const notImplemented = (name: string) => {
  throw new Error(`${name} is not implemented. Migrate to Azure.`);
};

// Stub exports - replace with Azure equivalents
export const adminAuth: any = new Proxy({}, { get: (_, prop) => () => notImplemented(`adminAuth.${String(prop)}`) });
export const adminDb: any = new Proxy({}, { get: (_, prop) => () => notImplemented(`adminDb.${String(prop)}`) });
export const adminStorage: any = new Proxy({}, { get: (_, prop) => () => notImplemented(`adminStorage.${String(prop)}`) });

// Timestamp/FieldValue stubs
export const FieldValue = {
  serverTimestamp: () => new Date(),
  increment: (n: number) => n,
  arrayUnion: (...elements: any[]) => elements,
  arrayRemove: (...elements: any[]) => elements,
  delete: () => undefined,
};

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

export default {};
