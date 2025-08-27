import { db } from '../db';
import { insuranceClaimsTable } from '../db/schema';
import { type GetClaimsByPolicyHolderInput, type InsuranceClaim } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getClaimsByPolicyHolder = async (input: GetClaimsByPolicyHolderInput): Promise<InsuranceClaim[]> => {
  try {
    // Query all claims for the specified policy holder, ordered by date_filed (newest first)
    const results = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.policy_holder_id, input.policy_holder_id))
      .orderBy(desc(insuranceClaimsTable.date_filed))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(claim => ({
      ...claim,
      amount: parseFloat(claim.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch claims by policy holder:', error);
    throw error;
  }
};