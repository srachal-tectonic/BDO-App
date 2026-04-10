// Server-side MongoDB/Cosmos DB operations (used by API routes)

import { Project } from '@/types';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

export const getProjectAdmin = async (projectId: string): Promise<Project | null> => {
  const col = await getCollection(COLLECTIONS.PROJECTS);
  const doc = await col.findOne({ id: projectId });
  return doc as Project | null;
};

export const updateProjectAdmin = async (
  projectId: string,
  updates: Partial<Project>
): Promise<void> => {
  const col = await getCollection(COLLECTIONS.PROJECTS);
  await col.updateOne(
    { id: projectId },
    { $set: { ...updates, updatedAt: new Date().toISOString() } }
  );
};
