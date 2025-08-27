import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { policyHoldersTable, insuranceClaimsTable } from '../db/schema';
import { type UpdateInsuranceClaimInput } from '../schema';
import { updateInsuranceClaim } from '../handlers/update_insurance_claim';
import { eq } from 'drizzle-orm';

// Test data setup
const testPolicyHolder = {
  name: 'John Doe',
  policy_number: 'POL-2024-001',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  address: '123 Main St, Anytown, USA',
  date_of_birth: new Date('1985-01-15')
};

const testClaim = {
  claim_id: 'CLM-2024-001',
  policy_holder_id: 1, // Will be set after creating policy holder
  date_filed: new Date('2024-01-01'),
  claim_type: 'AUTO' as const,
  status: 'PENDING' as const,
  amount: '5000.00',
  description: 'Car accident on highway'
};

describe('updateInsuranceClaim', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update claim status', async () => {
    // Create prerequisite policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    // Create claim to update
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        ...testClaim,
        policy_holder_id: policyHolderResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateInsuranceClaimInput = {
      id: claimResult[0].id,
      status: 'APPROVED'
    };

    const result = await updateInsuranceClaim(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(claimResult[0].id);
    expect(result!.status).toEqual('APPROVED');
    expect(result!.claim_id).toEqual('CLM-2024-001'); // Unchanged
    expect(result!.amount).toEqual(5000); // Numeric conversion
    expect(typeof result!.amount).toBe('number');
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update claim amount', async () => {
    // Create prerequisite policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    // Create claim to update
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        ...testClaim,
        policy_holder_id: policyHolderResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateInsuranceClaimInput = {
      id: claimResult[0].id,
      amount: 7500.50,
      description: 'Updated damage assessment'
    };

    const result = await updateInsuranceClaim(updateInput);

    expect(result).toBeDefined();
    expect(result!.amount).toEqual(7500.50);
    expect(typeof result!.amount).toBe('number');
    expect(result!.description).toEqual('Updated damage assessment');
    expect(result!.status).toEqual('PENDING'); // Unchanged
  });

  it('should update multiple fields at once', async () => {
    // Create prerequisite policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    // Create claim to update
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        ...testClaim,
        policy_holder_id: policyHolderResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateInsuranceClaimInput = {
      id: claimResult[0].id,
      status: 'INVESTIGATING',
      amount: 6200.75,
      claim_type: 'PROPERTY',
      description: 'Comprehensive investigation required'
    };

    const result = await updateInsuranceClaim(updateInput);

    expect(result).toBeDefined();
    expect(result!.status).toEqual('INVESTIGATING');
    expect(result!.amount).toEqual(6200.75);
    expect(result!.claim_type).toEqual('PROPERTY');
    expect(result!.description).toEqual('Comprehensive investigation required');
    expect(result!.claim_id).toEqual('CLM-2024-001'); // Unchanged
  });

  it('should save updates to database', async () => {
    // Create prerequisite policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    // Create claim to update
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        ...testClaim,
        policy_holder_id: policyHolderResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateInsuranceClaimInput = {
      id: claimResult[0].id,
      status: 'SETTLED',
      amount: 4800.00
    };

    await updateInsuranceClaim(updateInput);

    // Verify changes were saved to database
    const updatedClaim = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.id, claimResult[0].id))
      .execute();

    expect(updatedClaim).toHaveLength(1);
    expect(updatedClaim[0].status).toEqual('SETTLED');
    expect(parseFloat(updatedClaim[0].amount)).toEqual(4800.00);
    expect(updatedClaim[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent claim', async () => {
    const updateInput: UpdateInsuranceClaimInput = {
      id: 99999, // Non-existent ID
      status: 'APPROVED'
    };

    const result = await updateInsuranceClaim(updateInput);

    expect(result).toBeNull();
  });

  it('should update timestamp even with no field changes', async () => {
    // Create prerequisite policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    // Create claim to update
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        ...testClaim,
        policy_holder_id: policyHolderResult[0].id
      })
      .returning()
      .execute();

    const originalUpdatedAt = claimResult[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateInsuranceClaimInput = {
      id: claimResult[0].id
      // No other fields - only timestamp should update
    };

    const result = await updateInsuranceClaim(updateInput);

    expect(result).toBeDefined();
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle null description update', async () => {
    // Create prerequisite policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    // Create claim to update
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        ...testClaim,
        policy_holder_id: policyHolderResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateInsuranceClaimInput = {
      id: claimResult[0].id,
      description: null
    };

    const result = await updateInsuranceClaim(updateInput);

    expect(result).toBeDefined();
    expect(result!.description).toBeNull();
  });

  it('should throw error for foreign key constraint violation', async () => {
    // Create prerequisite policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    // Create claim to update
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        ...testClaim,
        policy_holder_id: policyHolderResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateInsuranceClaimInput = {
      id: claimResult[0].id,
      policy_holder_id: 99999 // Non-existent policy holder ID
    };

    expect(updateInsuranceClaim(updateInput)).rejects.toThrow(/foreign key constraint/i);
  });
});