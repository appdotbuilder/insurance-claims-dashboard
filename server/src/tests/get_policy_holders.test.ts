import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { policyHoldersTable } from '../db/schema';
import { getPolicyHolders } from '../handlers/get_policy_holders';
import { type CreatePolicyHolderInput } from '../schema';

// Test policy holder data
const testPolicyHolder1: CreatePolicyHolderInput = {
  name: 'John Doe',
  policy_number: 'POL-2024-001',
  email: 'john.doe@example.com',
  phone: '+1-555-123-4567',
  address: '123 Main St, New York, NY 10001',
  date_of_birth: new Date('1985-05-15')
};

const testPolicyHolder2: CreatePolicyHolderInput = {
  name: 'Alice Smith',
  policy_number: 'POL-2024-002', 
  email: 'alice.smith@example.com',
  phone: '+1-555-987-6543',
  address: '456 Oak Ave, Los Angeles, CA 90210',
  date_of_birth: new Date('1990-08-22')
};

const testPolicyHolder3: CreatePolicyHolderInput = {
  name: 'Bob Johnson',
  policy_number: 'POL-2024-003',
  email: 'bob.johnson@example.com',
  phone: '+1-555-456-7890',
  address: '789 Pine Rd, Chicago, IL 60601',
  date_of_birth: new Date('1978-12-03')
};

describe('getPolicyHolders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no policy holders exist', async () => {
    const result = await getPolicyHolders();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return single policy holder', async () => {
    // Create a policy holder first
    await db.insert(policyHoldersTable)
      .values(testPolicyHolder1)
      .execute();

    const result = await getPolicyHolders();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].policy_number).toEqual('POL-2024-001');
    expect(result[0].email).toEqual('john.doe@example.com');
    expect(result[0].phone).toEqual('+1-555-123-4567');
    expect(result[0].address).toEqual('123 Main St, New York, NY 10001');
    expect(result[0].date_of_birth).toEqual(new Date('1985-05-15'));
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple policy holders ordered by name', async () => {
    // Create multiple policy holders in different order
    await db.insert(policyHoldersTable)
      .values([testPolicyHolder1, testPolicyHolder2, testPolicyHolder3])
      .execute();

    const result = await getPolicyHolders();

    expect(result).toHaveLength(3);
    
    // Should be ordered by name alphabetically
    expect(result[0].name).toEqual('Alice Smith'); // First alphabetically
    expect(result[1].name).toEqual('Bob Johnson');
    expect(result[2].name).toEqual('John Doe'); // Last alphabetically
    
    // Verify all fields are present for each record
    result.forEach(policyHolder => {
      expect(policyHolder.id).toBeDefined();
      expect(policyHolder.name).toBeDefined();
      expect(policyHolder.policy_number).toBeDefined();
      expect(policyHolder.email).toBeDefined();
      expect(policyHolder.phone).toBeDefined();
      expect(policyHolder.address).toBeDefined();
      expect(policyHolder.date_of_birth).toBeInstanceOf(Date);
      expect(policyHolder.created_at).toBeInstanceOf(Date);
      expect(policyHolder.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return policy holders with different date formats correctly', async () => {
    // Create policy holder with specific date
    const specificDate = new Date('2023-01-15T10:30:00.000Z');
    const policyHolderWithDate = {
      ...testPolicyHolder1,
      date_of_birth: specificDate
    };

    await db.insert(policyHoldersTable)
      .values(policyHolderWithDate)
      .execute();

    const result = await getPolicyHolders();

    expect(result).toHaveLength(1);
    expect(result[0].date_of_birth).toBeInstanceOf(Date);
    expect(result[0].date_of_birth.getFullYear()).toEqual(2023);
    expect(result[0].date_of_birth.getMonth()).toEqual(0); // January is 0
    expect(result[0].date_of_birth.getDate()).toEqual(15);
  });

  it('should handle policy holders with unique policy numbers', async () => {
    // Create policy holders with different policy number formats
    const policyHolder1 = { ...testPolicyHolder1, policy_number: 'AUTO-2024-001' };
    const policyHolder2 = { ...testPolicyHolder2, policy_number: 'HOME-2024-001' };

    await db.insert(policyHoldersTable)
      .values([policyHolder1, policyHolder2])
      .execute();

    const result = await getPolicyHolders();

    expect(result).toHaveLength(2);
    
    const policyNumbers = result.map(p => p.policy_number);
    expect(policyNumbers).toContain('AUTO-2024-001');
    expect(policyNumbers).toContain('HOME-2024-001');
    expect(new Set(policyNumbers).size).toEqual(2); // All unique
  });
});