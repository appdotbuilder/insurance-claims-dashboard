import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { policyHoldersTable, insuranceClaimsTable } from '../db/schema';
import { getInsuranceClaims } from '../handlers/get_insurance_claims';

describe('getInsuranceClaims', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no claims exist', async () => {
    const result = await getInsuranceClaims();
    expect(result).toEqual([]);
  });

  it('should return all claims with policy holder information', async () => {
    // Create test policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values({
        name: 'John Doe',
        policy_number: 'POL-001',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        date_of_birth: new Date('1980-01-01')
      })
      .returning()
      .execute();

    const policyHolder = policyHolderResult[0];

    // Create test insurance claims
    await db.insert(insuranceClaimsTable)
      .values([
        {
          claim_id: 'CLM-001',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-15'),
          claim_type: 'AUTO',
          status: 'PENDING',
          amount: '5000.00',
          description: 'Car accident claim'
        },
        {
          claim_id: 'CLM-002',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-10'),
          claim_type: 'HOME',
          status: 'APPROVED',
          amount: '2500.50',
          description: 'Water damage claim'
        }
      ])
      .execute();

    const result = await getInsuranceClaims();

    expect(result).toHaveLength(2);

    // Verify first claim (should be newest first - CLM-001)
    const firstClaim = result[0];
    expect(firstClaim.claim_id).toEqual('CLM-001');
    expect(firstClaim.claim_type).toEqual('AUTO');
    expect(firstClaim.status).toEqual('PENDING');
    expect(firstClaim.amount).toEqual(5000.00);
    expect(typeof firstClaim.amount).toEqual('number');
    expect(firstClaim.description).toEqual('Car accident claim');
    expect(firstClaim.date_filed).toEqual(new Date('2024-01-15'));

    // Verify policy holder information is included
    expect(firstClaim.policy_holder).toBeDefined();
    expect(firstClaim.policy_holder.name).toEqual('John Doe');
    expect(firstClaim.policy_holder.policy_number).toEqual('POL-001');
    expect(firstClaim.policy_holder.email).toEqual('john@example.com');
    expect(firstClaim.policy_holder.phone).toEqual('555-1234');
    expect(firstClaim.policy_holder.address).toEqual('123 Main St');
    expect(firstClaim.policy_holder.date_of_birth).toEqual(new Date('1980-01-01'));

    // Verify second claim (older - CLM-002)
    const secondClaim = result[1];
    expect(secondClaim.claim_id).toEqual('CLM-002');
    expect(secondClaim.claim_type).toEqual('HOME');
    expect(secondClaim.status).toEqual('APPROVED');
    expect(secondClaim.amount).toEqual(2500.50);
    expect(typeof secondClaim.amount).toEqual('number');
    expect(secondClaim.description).toEqual('Water damage claim');
    expect(secondClaim.date_filed).toEqual(new Date('2024-01-10'));
  });

  it('should order claims by date_filed (newest first)', async () => {
    // Create policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values({
        name: 'Jane Smith',
        policy_number: 'POL-002',
        email: 'jane@example.com',
        phone: '555-5678',
        address: '456 Oak Ave',
        date_of_birth: new Date('1985-05-15')
      })
      .returning()
      .execute();

    const policyHolder = policyHolderResult[0];

    // Create claims with different dates
    await db.insert(insuranceClaimsTable)
      .values([
        {
          claim_id: 'CLM-OLD',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2023-12-01'),
          claim_type: 'LIFE',
          status: 'SETTLED',
          amount: '10000.00',
          description: 'Older claim'
        },
        {
          claim_id: 'CLM-NEW',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-02-01'),
          claim_type: 'HEALTH',
          status: 'INVESTIGATING',
          amount: '1500.00',
          description: 'Newer claim'
        },
        {
          claim_id: 'CLM-MIDDLE',
          policy_holder_id: policyHolder.id,
          date_filed: new Date('2024-01-15'),
          claim_type: 'PROPERTY',
          status: 'REJECTED',
          amount: '3000.00',
          description: 'Middle claim'
        }
      ])
      .execute();

    const result = await getInsuranceClaims();

    expect(result).toHaveLength(3);
    
    // Verify ordering by date_filed (newest first)
    expect(result[0].claim_id).toEqual('CLM-NEW');
    expect(result[0].date_filed).toEqual(new Date('2024-02-01'));
    
    expect(result[1].claim_id).toEqual('CLM-MIDDLE');
    expect(result[1].date_filed).toEqual(new Date('2024-01-15'));
    
    expect(result[2].claim_id).toEqual('CLM-OLD');
    expect(result[2].date_filed).toEqual(new Date('2023-12-01'));
  });

  it('should handle multiple policy holders correctly', async () => {
    // Create multiple policy holders
    const policyHolder1Result = await db.insert(policyHoldersTable)
      .values({
        name: 'Alice Johnson',
        policy_number: 'POL-100',
        email: 'alice@example.com',
        phone: '555-0001',
        address: '100 First St',
        date_of_birth: new Date('1975-03-20')
      })
      .returning()
      .execute();

    const policyHolder2Result = await db.insert(policyHoldersTable)
      .values({
        name: 'Bob Wilson',
        policy_number: 'POL-200',
        email: 'bob@example.com',
        phone: '555-0002',
        address: '200 Second St',
        date_of_birth: new Date('1990-07-10')
      })
      .returning()
      .execute();

    const policyHolder1 = policyHolder1Result[0];
    const policyHolder2 = policyHolder2Result[0];

    // Create claims for different policy holders
    await db.insert(insuranceClaimsTable)
      .values([
        {
          claim_id: 'CLM-A1',
          policy_holder_id: policyHolder1.id,
          date_filed: new Date('2024-01-20'),
          claim_type: 'AUTO',
          status: 'APPROVED',
          amount: '4000.00',
          description: 'Alice auto claim'
        },
        {
          claim_id: 'CLM-B1',
          policy_holder_id: policyHolder2.id,
          date_filed: new Date('2024-01-25'),
          claim_type: 'HOME',
          status: 'PENDING',
          amount: '6000.00',
          description: 'Bob home claim'
        }
      ])
      .execute();

    const result = await getInsuranceClaims();

    expect(result).toHaveLength(2);

    // Find claims by claim_id to verify correct policy holder association
    const aliceClaim = result.find(claim => claim.claim_id === 'CLM-A1');
    const bobClaim = result.find(claim => claim.claim_id === 'CLM-B1');

    expect(aliceClaim).toBeDefined();
    expect(aliceClaim!.policy_holder.name).toEqual('Alice Johnson');
    expect(aliceClaim!.policy_holder.policy_number).toEqual('POL-100');

    expect(bobClaim).toBeDefined();
    expect(bobClaim!.policy_holder.name).toEqual('Bob Wilson');
    expect(bobClaim!.policy_holder.policy_number).toEqual('POL-200');
  });

  it('should handle claims with null description', async () => {
    // Create policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values({
        name: 'Test User',
        policy_number: 'POL-TEST',
        email: 'test@example.com',
        phone: '555-9999',
        address: '999 Test St',
        date_of_birth: new Date('1988-12-25')
      })
      .returning()
      .execute();

    const policyHolder = policyHolderResult[0];

    // Create claim with null description
    await db.insert(insuranceClaimsTable)
      .values({
        claim_id: 'CLM-NULL',
        policy_holder_id: policyHolder.id,
        date_filed: new Date('2024-01-01'),
        claim_type: 'LIABILITY',
        status: 'PENDING',
        amount: '1000.00',
        description: null
      })
      .execute();

    const result = await getInsuranceClaims();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].claim_id).toEqual('CLM-NULL');
    expect(result[0].claim_type).toEqual('LIABILITY');
  });

  it('should properly convert numeric amount to number', async () => {
    // Create policy holder
    const policyHolderResult = await db.insert(policyHoldersTable)
      .values({
        name: 'Amount Test',
        policy_number: 'POL-AMT',
        email: 'amount@example.com',
        phone: '555-0000',
        address: '000 Amount St',
        date_of_birth: new Date('1995-01-01')
      })
      .returning()
      .execute();

    const policyHolder = policyHolderResult[0];

    // Create claim with decimal amount
    await db.insert(insuranceClaimsTable)
      .values({
        claim_id: 'CLM-AMT',
        policy_holder_id: policyHolder.id,
        date_filed: new Date('2024-01-01'),
        claim_type: 'HEALTH',
        status: 'APPROVED',
        amount: '12345.67',
        description: 'Amount conversion test'
      })
      .execute();

    const result = await getInsuranceClaims();

    expect(result).toHaveLength(1);
    expect(result[0].amount).toEqual(12345.67);
    expect(typeof result[0].amount).toEqual('number');
  });
});