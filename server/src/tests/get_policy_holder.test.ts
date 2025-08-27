import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { policyHoldersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetPolicyHolderInput, type CreatePolicyHolderInput } from '../schema';
import { getPolicyHolder } from '../handlers/get_policy_holder';

// Test data for creating policy holders
const testPolicyHolderData: CreatePolicyHolderInput = {
  name: 'John Doe',
  policy_number: 'POL-2024-001',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  address: '123 Main St, Anytown, ST 12345',
  date_of_birth: new Date('1980-01-01')
};

const anotherPolicyHolderData: CreatePolicyHolderInput = {
  name: 'Jane Smith',
  policy_number: 'POL-2024-002',
  email: 'jane.smith@example.com',
  phone: '+1-555-0456',
  address: '456 Oak Ave, Somewhere, ST 67890',
  date_of_birth: new Date('1975-06-15')
};

describe('getPolicyHolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a policy holder when found', async () => {
    // Create a test policy holder
    const insertResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolderData)
      .returning()
      .execute();

    const createdPolicyHolder = insertResult[0];
    const input: GetPolicyHolderInput = { id: createdPolicyHolder.id };

    // Get the policy holder
    const result = await getPolicyHolder(input);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdPolicyHolder.id);
    expect(result!.name).toBe('John Doe');
    expect(result!.policy_number).toBe('POL-2024-001');
    expect(result!.email).toBe('john.doe@example.com');
    expect(result!.phone).toBe('+1-555-0123');
    expect(result!.address).toBe('123 Main St, Anytown, ST 12345');
    expect(result!.date_of_birth).toEqual(new Date('1980-01-01'));
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when policy holder not found', async () => {
    // Try to get a non-existent policy holder
    const input: GetPolicyHolderInput = { id: 99999 };
    const result = await getPolicyHolder(input);

    expect(result).toBeNull();
  });

  it('should return the correct policy holder when multiple exist', async () => {
    // Create multiple policy holders
    const firstResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolderData)
      .returning()
      .execute();

    const secondResult = await db.insert(policyHoldersTable)
      .values(anotherPolicyHolderData)
      .returning()
      .execute();

    const firstPolicyHolder = firstResult[0];
    const secondPolicyHolder = secondResult[0];

    // Get the second policy holder
    const input: GetPolicyHolderInput = { id: secondPolicyHolder.id };
    const result = await getPolicyHolder(input);

    // Verify we got the correct one
    expect(result).not.toBeNull();
    expect(result!.id).toBe(secondPolicyHolder.id);
    expect(result!.name).toBe('Jane Smith');
    expect(result!.policy_number).toBe('POL-2024-002');
    expect(result!.email).toBe('jane.smith@example.com');
    
    // Make sure it's not the first policy holder
    expect(result!.id).not.toBe(firstPolicyHolder.id);
    expect(result!.name).not.toBe('John Doe');
  });

  it('should handle date fields correctly', async () => {
    // Create policy holder with specific dates
    const birthDate = new Date('1990-12-25');
    const policyHolderWithDates: CreatePolicyHolderInput = {
      ...testPolicyHolderData,
      date_of_birth: birthDate
    };

    const insertResult = await db.insert(policyHoldersTable)
      .values(policyHolderWithDates)
      .returning()
      .execute();

    const createdPolicyHolder = insertResult[0];
    const input: GetPolicyHolderInput = { id: createdPolicyHolder.id };

    const result = await getPolicyHolder(input);

    expect(result).not.toBeNull();
    expect(result!.date_of_birth).toBeInstanceOf(Date);
    expect(result!.date_of_birth.getFullYear()).toBe(1990);
    expect(result!.date_of_birth.getMonth()).toBe(11); // December is month 11
    expect(result!.date_of_birth.getDate()).toBe(25);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should verify policy holder exists in database after retrieval', async () => {
    // Create a test policy holder
    const insertResult = await db.insert(policyHoldersTable)
      .values(testPolicyHolderData)
      .returning()
      .execute();

    const createdPolicyHolder = insertResult[0];
    const input: GetPolicyHolderInput = { id: createdPolicyHolder.id };

    // Get the policy holder using our handler
    const handlerResult = await getPolicyHolder(input);

    // Verify it matches what's actually in the database
    const dbResult = await db.select()
      .from(policyHoldersTable)
      .where(eq(policyHoldersTable.id, createdPolicyHolder.id))
      .execute();

    expect(handlerResult).not.toBeNull();
    expect(dbResult).toHaveLength(1);
    
    const dbPolicyHolder = dbResult[0];
    expect(handlerResult!.id).toBe(dbPolicyHolder.id);
    expect(handlerResult!.name).toBe(dbPolicyHolder.name);
    expect(handlerResult!.policy_number).toBe(dbPolicyHolder.policy_number);
    expect(handlerResult!.email).toBe(dbPolicyHolder.email);
    expect(handlerResult!.phone).toBe(dbPolicyHolder.phone);
    expect(handlerResult!.address).toBe(dbPolicyHolder.address);
  });
});