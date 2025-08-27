import { db } from '../db';
import { insuranceClaimsTable, policyHoldersTable } from '../db/schema';
import { type CreateInsuranceClaimInput, type InsuranceClaim } from '../schema';
import { eq } from 'drizzle-orm';

export const createInsuranceClaim = async (input: CreateInsuranceClaimInput): Promise<InsuranceClaim> => {
  try {
    // Validate that policy holder exists
    const policyHolder = await db.select()
      .from(policyHoldersTable)
      .where(eq(policyHoldersTable.id, input.policy_holder_id))
      .execute();

    if (policyHolder.length === 0) {
      throw new Error(`Policy holder with ID ${input.policy_holder_id} not found`);
    }

    // Check if claim_id is unique
    const existingClaim = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.claim_id, input.claim_id))
      .execute();

    if (existingClaim.length > 0) {
      throw new Error(`Claim with ID ${input.claim_id} already exists`);
    }

    // Insert new insurance claim
    const result = await db.insert(insuranceClaimsTable)
      .values({
        claim_id: input.claim_id,
        policy_holder_id: input.policy_holder_id,
        date_filed: input.date_filed,
        claim_type: input.claim_type,
        status: input.status ?? 'PENDING', // Use nullish coalescing for better handling
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description ?? null // Use nullish coalescing for better handling
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const claim = result[0];
    return {
      ...claim,
      amount: parseFloat(claim.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Insurance claim creation failed:', error);
    throw error;
  }
};