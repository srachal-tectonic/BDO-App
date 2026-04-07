// TODO: Implement with Azure equivalents
// This file provides stub exports to prevent import errors.

const notImplemented = (name: string) => {
  throw new Error(`${name} is not implemented. Migrate to Azure.`);
};

// Stub exports - replace with Azure equivalents
export const auth: any = new Proxy({}, { get: (_, prop) => () => notImplemented(`auth.${String(prop)}`) });
export const db: any = new Proxy({}, { get: (_, prop) => () => notImplemented(`db.${String(prop)}`) });
export const storage: any = new Proxy({}, { get: (_, prop) => () => notImplemented(`storage.${String(prop)}`) });
export const analytics: any = null;

export default {};
