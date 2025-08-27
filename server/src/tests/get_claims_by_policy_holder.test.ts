import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { policyHoldersTable, insuranceClaimsTable } from '../db/schema';
import { type GetClaimsByPolicyHolderInput } from '../schema';
import { getClaimsByPolicyHolder } from '../handlers/get_claims_by_policy_holder';

describe('getClaimsByPolicyHolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when policy holder has no claims', async () => {
    // Create a policy holder with no claims
    const [policyHolder] = await db.insert(policyHoldersTable)
      .values({
        name: 'John Doe',
        policy_number: 'POL-001',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
        date_of_birth: new Date('1980-01-01')
      })
      .returning()
      .execute();

    const input: GetClaimsByPolicyHolderInput = {
      policy_holder_id: policyHolder.id
    };

    const result = await getClaimsByPolicyHolder(input);

    expect(result).toEqual([]);
  });

  it('should return all claims for a specific policy holder', async () => {
    // Create two policy holders
    const [policyHolder1, policyHolder2] = await db.insert(policyHoldersTable)
      .values([
        {
          name: 'John Doe',
          policy_number: 'POL-001',
          email: 'john@example.com',
          phone: '123-456-7890',
          address: '123 Main St',
          date_of_birth: new Date('1980-01-01')
        },
        {
          name: 'Jane Smith',
          policy_number: 'POL-002',
          email: 'jane@example.com',
          phone: '123-456-7891',
          address: '456 Oak Ave',
          date_of_birth: new Date('1985-05-15')
        }
      ])
      .returning()
      .execute();

    // Create claims for both policy holders
    await db.insert(insuranceClaimsTable)
      .values([
        {
          claim_id: 'CLM-001',
          policy_holder_id: policyHolder1.id,
          date_filed: new Date('2024-01-15'),
          claim_type: 'AUTO',
          status: 'PENDING',
          amount: '5000.00',
          description: 'Car accident claim'
        },
        {
          claim_id: 'CLM-002',
          policy_holder_id: policyHolder1.id,
          date_filed: new Date('2024-02-01'),
          claim_type: 'HOME',
          status: 'APPROVED',
          amount: '3000.50',
          description: 'Water damage claim'
        },
        {
          claim_id: 'CLM-003',
          policy_holder_id: policyHolder2.id,
          date_filed: new Date('2024-01-20'),
          claim_type: 'HEALTH',
          status: 'SETTLED',
          amount: '1500.75',
          description: 'Medical expense claim'
        }
      ])
      .execute();

    const input: GetClaimsByPolicyHolderInput = {
      policy_holder_id: policyHolder1.id
    };

    const result = await getClaimsByPolicyHolder(input);

    // Should return only claims for policy holder 1
    expect(result).toHaveLength(2);
    
    // Verify all claims belong to the correct policy holder
    result.forEach(claim => {
      expect(claim.policy_holder_id).toEqual(policyHolder1.id);
    });

    // Verify specific claim data and numeric conversion
    const claim1 = result.find(c => c.claim_id === 'CLM-001');
    const claim2 = result.find(c => c.claim_id === 'CLM-002');
    
    expect(claim1).toBeDefined();
    expect(claim1!.amount).toEqual(5000.00);
    expect(typeof claim1!.amount).toBe('number');
    expect(claim1!.claim_type).toEqual('AUTO');
    expect(claim1!.status).toEqual('PENDING');
    
    expect(claim2).toBeDefined();
    expect(claim2!.amount).toEqual(3000.50);
    expect(typeof claim2!.amount).toBe('number');
    expect(claim2!.claim_type).toEqual('HOME');
    expect(claim2!.status).toEqual('APPROVED');
  });

  it('should return claims ordered by date_filed (newest first)', async () => {
    // Create a policy holder
    const [policyHolder] = await db.insert(policyHoldersTable)
      .values({
        name: 'John Doe',
        policy_number: 'POL-001',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
        date_of_birth: new Date('1980-01-01')
      })
      .returning()
      .execute();

    // Create claims with different dates
    await db.insert(insuranceClaimsTable)
      .values([
        {
          claim_id: 'CLM-001',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-01'), // Oldest
          claim_type: 'AUTO',
          status: 'PENDING',
          amount: '1000.00',
          description: 'First claim'
        },
        {
          claim_id: 'CLM-002',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-03-01'), // Newest
          claim_type: 'HOME',
          status: 'APPROVED',
          amount: '3000.00',
          description: 'Third claim'
        },
        {
          claim_id: 'CLM-003',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-02-01'), // Middle
          claim_type: 'HEALTH',
          status: 'INVESTIGATING',
          amount: '2000.00',
          description: 'Second claim'
        }
      ])
      .execute();

    const input: GetClaimsByPolicyHolderInput = {
      policy_holder_id: policyHolder.id
    };

    const result = await getClaimsByPolicyHolder(input);

    expect(result).toHaveLength(3);
    
    // Verify order by date_filed (newest first)
    expect(result[0].claim_id).toEqual('CLM-002'); // 2024-03-01
    expect(result[1].claim_id).toEqual('CLM-003'); // 2024-02-01
    expect(result[2].claim_id).toEqual('CLM-001'); // 2024-01-01

    // Verify dates are in descending order
    expect(result[0].date_filed >= result[1].date_filed).toBe(true);
    expect(result[1].date_filed >= result[2].date_filed).toBe(true);
  });

  it('should return empty array for non-existent policy holder', async () => {
    const input: GetClaimsByPolicyHolderInput = {
      policy_holder_id: 999999 // Non-existent ID
    };

    const result = await getClaimsByPolicyHolder(input);

    expect(result).toEqual([]);
  });

  it('should handle claims with various status types', async () => {
    // Create a policy holder
    const [policyHolder] = await db.insert(policyHoldersTable)
      .values({
        name: 'John Doe',
        policy_number: 'POL-001',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
        date_of_birth: new Date('1980-01-01')
      })
      .returning()
      .execute();

    // Create claims with different statuses
    await db.insert(insuranceClaimsTable)
      .values([
        {
          claim_id: 'CLM-001',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-01'),
          claim_type: 'AUTO',
          status: 'PENDING',
          amount: '1000.00'
        },
        {
          claim_id: 'CLM-002',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-02'),
          claim_type: 'HOME',
          status: 'APPROVED',
          amount: '2000.00'
        },
        {
          claim_id: 'CLM-003',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-03'),
          claim_type: 'HEALTH',
          status: 'REJECTED',
          amount: '3000.00'
        },
        {
          claim_id: 'CLM-004',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-04'),
          claim_type: 'LIFE',
          status: 'INVESTIGATING',
          amount: '4000.00'
        },
        {
          claim_id: 'CLM-005',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-05'),
          claim_type: 'PROPERTY',
          status: 'SETTLED',
          amount: '5000.00'
        }
      ])
      .execute();

    const input: GetClaimsByPolicyHolderInput = {
      policy_holder_id: policyHolder.id
    };

    const result = await getClaimsByPolicyHolder(input);

    expect(result).toHaveLength(5);

    // Verify all status types are present and correctly returned
    const statuses = result.map(claim => claim.status);
    expect(statuses).toContain('PENDING');
    expect(statuses).toContain('APPROVED');
    expect(statuses).toContain('REJECTED');
    expect(statuses).toContain('INVESTIGATING');
    expect(statuses).toContain('SETTLED');
  });
});