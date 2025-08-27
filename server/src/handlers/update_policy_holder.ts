import { db } from '../db';
import { policyHoldersTable } from '../db/schema';
import { type UpdatePolicyHolderInput, type PolicyHolder } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePolicyHolder = async (input: UpdatePolicyHolderInput): Promise<PolicyHolder | null> => {
  try {
    // First check if the policy holder exists
    const existingPolicyHolder = await db.select()
      .from(policyHoldersTable)
      .where(eq(policyHoldersTable.id, input.id))
      .execute();

    if (existingPolicyHolder.length === 0) {
      return null; // Policy holder not found
    }

    // Build the update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.policy_number !== undefined) updateData.policy_number = input.policy_number;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.date_of_birth !== undefined) updateData.date_of_birth = input.date_of_birth;
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Perform the update
    const result = await db.update(policyHoldersTable)
      .set(updateData)
      .where(eq(policyHoldersTable.id, input.id))
      .returning()
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Policy holder update failed:', error);
    throw error;
  }
};