import { db } from '../db';
import { insuranceClaimsTable, policyHoldersTable } from '../db/schema';
import { type ClaimWithPolicyHolder } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getInsuranceClaims = async (): Promise<ClaimWithPolicyHolder[]> => {
  try {
    // Query with join to get claims with policy holder information
    const results = await db.select()
      .from(insuranceClaimsTable)
      .innerJoin(policyHoldersTable, eq(insuranceClaimsTable.policy_holder_id, policyHoldersTable.id))
      .orderBy(desc(insuranceClaimsTable.date_filed))
      .execute();

    // Transform joined results to match ClaimWithPolicyHolder schema
    return results.map(result => ({
      // Claim fields with numeric conversion for amount
      id: result.insurance_claims.id,
      claim_id: result.insurance_claims.claim_id,
      policy_holder_id: result.insurance_claims.policy_holder_id,
      date_filed: result.insurance_claims.date_filed,
      claim_type: result.insurance_claims.claim_type,
      status: result.insurance_claims.status,
      amount: parseFloat(result.insurance_claims.amount), // Convert numeric to number
      description: result.insurance_claims.description,
      created_at: result.insurance_claims.created_at,
      updated_at: result.insurance_claims.updated_at,
      // Nested policy holder object
      policy_holder: {
        id: result.policy_holders.id,
        name: result.policy_holders.name,
        policy_number: result.policy_holders.policy_number,
        email: result.policy_holders.email,
        phone: result.policy_holders.phone,
        address: result.policy_holders.address,
        date_of_birth: result.policy_holders.date_of_birth,
        created_at: result.policy_holders.created_at,
        updated_at: result.policy_holders.updated_at
      }
    }));
  } catch (error) {
    console.error('Failed to fetch insurance claims:', error);
    throw error;
  }
};