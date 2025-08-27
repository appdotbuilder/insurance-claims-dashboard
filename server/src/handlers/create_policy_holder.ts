import { db } from '../db';
import { policyHoldersTable } from '../db/schema';
import { type CreatePolicyHolderInput, type PolicyHolder } from '../schema';

export const createPolicyHolder = async (input: CreatePolicyHolderInput): Promise<PolicyHolder> => {
  try {
    // Insert policy holder record
    const result = await db.insert(policyHoldersTable)
      .values({
        name: input.name,
        policy_number: input.policy_number,
        email: input.email,
        phone: input.phone,
        address: input.address,
        date_of_birth: input.date_of_birth
      })
      .returning()
      .execute();

    // Return the created policy holder
    return result[0];
  } catch (error) {
    console.error('Policy holder creation failed:', error);
    throw error;
  }
};