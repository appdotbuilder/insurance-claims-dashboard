import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { policyHoldersTable, insuranceClaimsTable } from '../db/schema';
import { type GetClaimInput, type CreatePolicyHolderInput, type CreateInsuranceClaimInput } from '../schema';
import { getInsuranceClaim } from '../handlers/get_insurance_claim';

// Test data
const testPolicyHolder: CreatePolicyHolderInput = {
  name: 'Jane Smith',
  policy_number: 'POL-2024-100',
  email: 'jane.smith@example.com',
  phone: '+1-555-0100',
  address: '456 Oak Street, Test City, TC 67890',
  date_of_birth: new Date('1985-03-15')
};

const testClaim: CreateInsuranceClaimInput = {
  claim_id: 'CLM-2024-100',
  policy_holder_id: 1, // Will be set after creating policy holder
  date_filed: new Date('2024-01-15'),
  claim_type: 'HOME',
  status: 'INVESTIGATING',
  amount: 12500.75,
  description: 'Water damage from burst pipe'
};

describe('getInsuranceClaim', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return claim with policy holder information when found', async () => {
    // Create policy holder first
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values({
        name: testPolicyHolder.name,
        policy_number: testPolicyHolder.policy_number,
        email: testPolicyHolder.email,
        phone: testPolicyHolder.phone,
        address: testPolicyHolder.address,
        date_of_birth: testPolicyHolder.date_of_birth
      })
      .returning()
      .execute();

    const policyHolderId = policyHolderResult[0].id;

    // Create insurance claim
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        claim_id: testClaim.claim_id,
        policy_holder_id: policyHolderId,
        date_filed: testClaim.date_filed,
        claim_type: testClaim.claim_type,
        status: testClaim.status,
        amount: testClaim.amount.toString(), // Convert to string for numeric column
        description: testClaim.description
      })
      .returning()
      .execute();

    const claimId = claimResult[0].id;

    // Test the handler
    const input: GetClaimInput = { id: claimId };
    const result = await getInsuranceClaim(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(claimId);
    expect(result!.claim_id).toEqual('CLM-2024-100');
    expect(result!.policy_holder_id).toEqual(policyHolderId);
    expect(result!.date_filed).toBeInstanceOf(Date);
    expect(result!.claim_type).toEqual('HOME');
    expect(result!.status).toEqual('INVESTIGATING');
    expect(result!.amount).toEqual(12500.75);
    expect(typeof result!.amount).toBe('number');
    expect(result!.description).toEqual('Water damage from burst pipe');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify policy holder information is included
    expect(result!.policy_holder).toBeDefined();
    expect(result!.policy_holder.id).toEqual(policyHolderId);
    expect(result!.policy_holder.name).toEqual('Jane Smith');
    expect(result!.policy_holder.policy_number).toEqual('POL-2024-100');
    expect(result!.policy_holder.email).toEqual('jane.smith@example.com');
    expect(result!.policy_holder.phone).toEqual('+1-555-0100');
    expect(result!.policy_holder.address).toEqual('456 Oak Street, Test City, TC 67890');
    expect(result!.policy_holder.date_of_birth).toBeInstanceOf(Date);
    expect(result!.policy_holder.created_at).toBeInstanceOf(Date);
    expect(result!.policy_holder.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when claim does not exist', async () => {
    const input: GetClaimInput = { id: 999 };
    const result = await getInsuranceClaim(input);

    expect(result).toBeNull();
  });

  it('should handle claims with null descriptions', async () => {
    // Create policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values({
        name: testPolicyHolder.name,
        policy_number: testPolicyHolder.policy_number,
        email: testPolicyHolder.email,
        phone: testPolicyHolder.phone,
        address: testPolicyHolder.address,
        date_of_birth: testPolicyHolder.date_of_birth
      })
      .returning()
      .execute();

    const policyHolderId = policyHolderResult[0].id;

    // Create claim with null description
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        claim_id: 'CLM-2024-101',
        policy_holder_id: policyHolderId,
        date_filed: new Date('2024-01-20'),
        claim_type: 'AUTO',
        status: 'PENDING',
        amount: '2500.00',
        description: null // Explicitly null
      })
      .returning()
      .execute();

    const claimId = claimResult[0].id;

    // Test the handler
    const input: GetClaimInput = { id: claimId };
    const result = await getInsuranceClaim(input);

    expect(result).not.toBeNull();
    expect(result!.description).toBeNull();
    expect(result!.claim_type).toEqual('AUTO');
    expect(result!.status).toEqual('PENDING');
    expect(result!.amount).toEqual(2500.00);
  });

  it('should handle different claim types and statuses correctly', async () => {
    // Create policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values({
        name: testPolicyHolder.name,
        policy_number: testPolicyHolder.policy_number,
        email: testPolicyHolder.email,
        phone: testPolicyHolder.phone,
        address: testPolicyHolder.address,
        date_of_birth: testPolicyHolder.date_of_birth
      })
      .returning()
      .execute();

    const policyHolderId = policyHolderResult[0].id;

    // Create claim with different type and status
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        claim_id: 'CLM-2024-102',
        policy_holder_id: policyHolderId,
        date_filed: new Date('2024-02-01'),
        claim_type: 'LIFE',
        status: 'APPROVED',
        amount: '50000.00',
        description: 'Life insurance claim'
      })
      .returning()
      .execute();

    const claimId = claimResult[0].id;

    // Test the handler
    const input: GetClaimInput = { id: claimId };
    const result = await getInsuranceClaim(input);

    expect(result).not.toBeNull();
    expect(result!.claim_type).toEqual('LIFE');
    expect(result!.status).toEqual('APPROVED');
    expect(result!.amount).toEqual(50000.00);
    expect(result!.description).toEqual('Life insurance claim');
  });

  it('should properly convert numeric amount to number', async () => {
    // Create policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values({
        name: testPolicyHolder.name,
        policy_number: testPolicyHolder.policy_number,
        email: testPolicyHolder.email,
        phone: testPolicyHolder.phone,
        address: testPolicyHolder.address,
        date_of_birth: testPolicyHolder.date_of_birth
      })
      .returning()
      .execute();

    const policyHolderId = policyHolderResult[0].id;

    // Create claim with precise decimal amount
    const claimResult = await db.insert(insuranceClaimsTable)
      .values({
        claim_id: 'CLM-2024-103',
        policy_holder_id: policyHolderId,
        date_filed: new Date('2024-02-15'),
        claim_type: 'PROPERTY',
        status: 'SETTLED',
        amount: '99999.99', // Precise decimal as string
        description: 'Property damage claim'
      })
      .returning()
      .execute();

    const claimId = claimResult[0].id;

    // Test the handler
    const input: GetClaimInput = { id: claimId };
    const result = await getInsuranceClaim(input);

    expect(result).not.toBeNull();
    expect(typeof result!.amount).toBe('number');
    expect(result!.amount).toEqual(99999.99);
    expect(result!.amount.toFixed(2)).toEqual('99999.99');
  });
});