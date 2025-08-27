import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { insuranceClaimsTable, policyHoldersTable } from '../db/schema';
import { type CreateInsuranceClaimInput } from '../schema';
import { createInsuranceClaim } from '../handlers/create_insurance_claim';
import { eq } from 'drizzle-orm';

// Test data for policy holder
const testPolicyHolder = {
  name: 'John Doe',
  policy_number: 'POL-2024-001',
  email: 'john.doe@email.com',
  phone: '555-0123',
  address: '123 Main St, City, State 12345',
  date_of_birth: new Date('1980-01-01')
};

// Test input for insurance claim
const testClaimInput: CreateInsuranceClaimInput = {
  claim_id: 'CLM-2024-001',
  policy_holder_id: 1, // Will be set to actual ID after creating policy holder
  date_filed: new Date('2024-01-15'),
  claim_type: 'AUTO',
  status: 'PENDING',
  amount: 5000.50,
  description: 'Vehicle accident claim'
};

describe('createInsuranceClaim', () => {
  let policyHolderId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a policy holder for testing
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();
    
    policyHolderId = policyHolderResult[0].id;
    testClaimInput.policy_holder_id = policyHolderId;
  });

  afterEach(resetDB);

  it('should create an insurance claim with all fields', async () => {
    const result = await createInsuranceClaim(testClaimInput);

    // Basic field validation
    expect(result.claim_id).toEqual('CLM-2024-001');
    expect(result.policy_holder_id).toEqual(policyHolderId);
    expect(result.date_filed).toEqual(testClaimInput.date_filed);
    expect(result.claim_type).toEqual('AUTO');
    expect(result.status).toEqual('PENDING');
    expect(result.amount).toEqual(5000.50);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Vehicle accident claim');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save insurance claim to database', async () => {
    const result = await createInsuranceClaim(testClaimInput);

    // Query the database to verify claim was saved
    const claims = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.id, result.id))
      .execute();

    expect(claims).toHaveLength(1);
    expect(claims[0].claim_id).toEqual('CLM-2024-001');
    expect(claims[0].policy_holder_id).toEqual(policyHolderId);
    expect(claims[0].claim_type).toEqual('AUTO');
    expect(claims[0].status).toEqual('PENDING');
    expect(parseFloat(claims[0].amount)).toEqual(5000.50);
    expect(claims[0].description).toEqual('Vehicle accident claim');
    expect(claims[0].created_at).toBeInstanceOf(Date);
    expect(claims[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create claim with default PENDING status when not provided', async () => {
    const { status, ...inputWithoutStatus } = testClaimInput;

    const result = await createInsuranceClaim(inputWithoutStatus as CreateInsuranceClaimInput);

    expect(result.status).toEqual('PENDING');

    // Verify in database
    const claims = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.id, result.id))
      .execute();

    expect(claims[0].status).toEqual('PENDING');
  });

  it('should create claim with null description when not provided', async () => {
    const { description, ...inputWithoutDescription } = testClaimInput;

    const result = await createInsuranceClaim(inputWithoutDescription as CreateInsuranceClaimInput);

    expect(result.description).toBeNull();

    // Verify in database
    const claims = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.id, result.id))
      .execute();

    expect(claims[0].description).toBeNull();
  });

  it('should handle different claim types correctly', async () => {
    const healthClaimInput = {
      ...testClaimInput,
      claim_id: 'CLM-2024-002',
      claim_type: 'HEALTH' as const,
      amount: 1200.75
    };

    const result = await createInsuranceClaim(healthClaimInput);

    expect(result.claim_type).toEqual('HEALTH');
    expect(result.amount).toEqual(1200.75);
    expect(typeof result.amount).toBe('number');
  });

  it('should throw error when policy holder does not exist', async () => {
    const invalidInput = {
      ...testClaimInput,
      policy_holder_id: 99999 // Non-existent policy holder ID
    };

    await expect(createInsuranceClaim(invalidInput))
      .rejects.toThrow(/Policy holder with ID 99999 not found/i);
  });

  it('should throw error when claim_id already exists', async () => {
    // Create first claim
    await createInsuranceClaim(testClaimInput);

    // Try to create second claim with same claim_id
    const duplicateInput = {
      ...testClaimInput,
      amount: 3000.00 // Different amount but same claim_id
    };

    await expect(createInsuranceClaim(duplicateInput))
      .rejects.toThrow(/Claim with ID CLM-2024-001 already exists/i);
  });

  it('should handle different status values correctly', async () => {
    const approvedClaimInput = {
      ...testClaimInput,
      claim_id: 'CLM-2024-003',
      status: 'APPROVED' as const
    };

    const result = await createInsuranceClaim(approvedClaimInput);

    expect(result.status).toEqual('APPROVED');

    // Verify in database
    const claims = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.id, result.id))
      .execute();

    expect(claims[0].status).toEqual('APPROVED');
  });

  it('should handle decimal amounts correctly', async () => {
    const decimalAmountInput = {
      ...testClaimInput,
      claim_id: 'CLM-2024-004',
      amount: 999.99
    };

    const result = await createInsuranceClaim(decimalAmountInput);

    expect(result.amount).toEqual(999.99);
    expect(typeof result.amount).toBe('number');

    // Verify precision is maintained in database
    const claims = await db.select()
      .from(insuranceClaimsTable)
      .where(eq(insuranceClaimsTable.id, result.id))
      .execute();

    expect(parseFloat(claims[0].amount)).toEqual(999.99);
  });
});