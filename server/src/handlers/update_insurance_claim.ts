import { db } from '../db';
import { insuranceClaimsTable } from '../db/schema';
import { type UpdateInsuranceClaimInput, type InsuranceClaim } from '../schema';
import { eq } from 'drizzle-orm';

export const updateInsuranceClaim = async (input: UpdateInsuranceClaimInput): Promise<InsuranceClaim | null> => {
  try {
    // First check if the claim exists
    const existingClaim = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.id, input.id))
      .execute();

    if (existingClaim.length === 0) {
      return null;
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date() // Always update the timestamp
    };

    if (input.claim_id !== undefined) {
      updateData['claim_id'] = input.claim_id;
    }
    if (input.policy_holder_id !== undefined) {
      updateData['policy_holder_id'] = input.policy_holder_id;
    }
    if (input.date_filed !== undefined) {
      updateData['date_filed'] = input.date_filed;
    }
    if (input.claim_type !== undefined) {
      updateData['claim_type'] = input.claim_type;
    }
    if (input.status !== undefined) {
      updateData['status'] = input.status;
    }
    if (input.amount !== undefined) {
      updateData['amount'] = input.amount.toString(); // Convert number to string for numeric column
    }
    if (input.description !== undefined) {
      updateData['description'] = input.description;
    }

    // Update the claim
    const result = await db.update(insuranceClaimsTable)
      .set(updateData)
      .where(eq(insuranceClaimsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedClaim = result[0];
    return {
      ...updatedClaim,
      amount: parseFloat(updatedClaim.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Insurance claim update failed:', error);
    throw error;
  }
};