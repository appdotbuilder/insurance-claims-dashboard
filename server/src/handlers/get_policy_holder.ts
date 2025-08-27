import { db } from '../db';
import { policyHoldersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetPolicyHolderInput, type PolicyHolder } from '../schema';

export const getPolicyHolder = async (input: GetPolicyHolderInput): Promise<PolicyHolder | null> => {
  try {
    // Query the policy holder by ID
    const results = await db.select()
      .from(policyHoldersTable)
      .where(eq(policyHoldersTable.id, input.id))
      .execute();

    // Return null if policy holder not found
    if (results.length === 0) {
      return null;
    }

    // Return the first (and should be only) result
    return results[0];
  } catch (error) {
    console.error('Failed to get policy holder:', error);
    throw error;
  }
};