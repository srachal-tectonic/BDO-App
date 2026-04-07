// TODO: Implement with Azure Cosmos DB operations

import { BrokerToken } from '@/types';

export interface CreateBrokerTokenInput {
  projectId: string;
  createdBy: string;
  createdByName: string;
  expiresInDays?: number;
  brokerEmail?: string;
  brokerName?: string;
}

export interface BrokerTokenValidationResult {
  valid: boolean;
  error?: 'not_found' | 'expired' | 'revoked';
  token?: BrokerToken;
}

const notImpl = (name: string): never => {
  throw new Error(`${name} not implemented. Migrate to Azure Cosmos DB.`);
};

export const createBrokerToken = async (input: CreateBrokerTokenInput): Promise<BrokerToken> => notImpl('createBrokerToken');
export const getBrokerToken = async (token: string): Promise<BrokerToken | null> => notImpl('getBrokerToken');
export const getProjectBrokerTokens = async (projectId: string): Promise<BrokerToken[]> => notImpl('getProjectBrokerTokens');
export const revokeBrokerToken = async (token: string): Promise<void> => notImpl('revokeBrokerToken');
export const deleteBrokerToken = async (token: string): Promise<void> => notImpl('deleteBrokerToken');
export const updateBrokerTokenAccess = async (token: string): Promise<void> => notImpl('updateBrokerTokenAccess');
export const incrementBrokerTokenUploadCount = async (token: string): Promise<void> => notImpl('incrementBrokerTokenUploadCount');
export const validateBrokerToken = async (token: string): Promise<BrokerTokenValidationResult> => notImpl('validateBrokerToken');
