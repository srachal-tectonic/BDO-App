// TODO: Implement with Azure Cosmos DB operations

import { Project } from '@/types';

export const getProjectAdmin = async (projectId: string): Promise<Project | null> => {
  // TODO: Implement with Azure Cosmos DB
  throw new Error('getProjectAdmin not implemented. Migrate to Azure Cosmos DB.');
};

export const updateProjectAdmin = async (
  projectId: string,
  updates: Partial<Project>
): Promise<void> => {
  // TODO: Implement with Azure Cosmos DB
  throw new Error('updateProjectAdmin not implemented. Migrate to Azure Cosmos DB.');
};
