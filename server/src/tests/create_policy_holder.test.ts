import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { policyHoldersTable } from '../db/schema';
import { type CreatePolicyHolderInput } from '../schema';
import { createPolicyHolder } from '../handlers/create_policy_holder';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreatePolicyHolderInput = {
  name: 'John Doe',
  policy_number: 'POL-2024-001',
  email: 'john.doe@example.com',
  phone: '+1-555-123-4567',
  address: '123 Main Street, Anytown, ST 12345',
  date_of_birth: new Date('1985-06-15')
};

describe('createPolicyHolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a policy holder', async () => {
    const result = await createPolicyHolder(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.policy_number).toEqual('POL-2024-001');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1-555-123-4567');
    expect(result.address).toEqual('123 Main Street, Anytown, ST 12345');
    expect(result.date_of_birth).toEqual(new Date('1985-06-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save policy holder to database', async () => {
    const result = await createPolicyHolder(testInput);

    // Query using proper drizzle syntax
    const policyHolders = await db.select()
      .from(policyHoldersTable)
      .where(eq(policyHoldersTable.id, result.id))
      .execute();

    expect(policyHolders).toHaveLength(1);
    expect(policyHolders[0].name).toEqual('John Doe');
    expect(policyHolders[0].policy_number).toEqual('POL-2024-001');
    expect(policyHolders[0].email).toEqual('john.doe@example.com');
    expect(policyHolders[0].phone).toEqual('+1-555-123-4567');
    expect(policyHolders[0].address).toEqual('123 Main Street, Anytown, ST 12345');
    expect(policyHolders[0].date_of_birth).toEqual(new Date('1985-06-15'));
    expect(policyHolders[0].created_at).toBeInstanceOf(Date);
    expect(policyHolders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique policy number constraint', async () => {
    // Create first policy holder
    await createPolicyHolder(testInput);

    // Try to create another with same policy number
    const duplicateInput: CreatePolicyHolderInput = {
      ...testInput,
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    };

    await expect(createPolicyHolder(duplicateInput)).rejects.toThrow(/unique constraint/i);
  });

  it('should handle date fields correctly', async () => {
    const birthDate = new Date('1990-12-25');
    const inputWithSpecificDate: CreatePolicyHolderInput = {
      ...testInput,
      date_of_birth: birthDate
    };

    const result = await createPolicyHolder(inputWithSpecificDate);

    expect(result.date_of_birth).toEqual(birthDate);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify dates are properly stored in database
    const stored = await db.select()
      .from(policyHoldersTable)
      .where(eq(policyHoldersTable.id, result.id))
      .execute();

    expect(stored[0].date_of_birth).toEqual(birthDate);
    expect(stored[0].created_at).toBeInstanceOf(Date);
    expect(stored[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple policy holders with different policy numbers', async () => {
    // Create first policy holder
    const result1 = await createPolicyHolder(testInput);

    // Create second policy holder with different policy number
    const secondInput: CreatePolicyHolderInput = {
      name: 'Jane Smith',
      policy_number: 'POL-2024-002',
      email: 'jane.smith@example.com',
      phone: '+1-555-987-6543',
      address: '456 Oak Avenue, Another City, ST 67890',
      date_of_birth: new Date('1992-03-20')
    };

    const result2 = await createPolicyHolder(secondInput);

    // Verify both were created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.policy_number).toEqual('POL-2024-001');
    expect(result2.policy_number).toEqual('POL-2024-002');

    // Verify both exist in database
    const allPolicyHolders = await db.select()
      .from(policyHoldersTable)
      .execute();

    expect(allPolicyHolders).toHaveLength(2);
    expect(allPolicyHolders.map(p => p.policy_number)).toContain('POL-2024-001');
    expect(allPolicyHolders.map(p => p.policy_number)).toContain('POL-2024-002');
  });
});