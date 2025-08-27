import { db } from '../db';
import { policyHoldersTable } from '../db/schema';
import { type PolicyHolder } from '../schema';
import { asc } from 'drizzle-orm';

export const getPolicyHolders = async (): Promise<PolicyHolder[]> => {
  try {
    const results = await db.select()
      .from(policyHoldersTable)
      .orderBy(asc(policyHoldersTable.name))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch policy holders:', error);
    throw error;
  }
};