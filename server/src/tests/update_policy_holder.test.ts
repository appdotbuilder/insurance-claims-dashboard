import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { policyHoldersTable } from '../db/schema';
import { type UpdatePolicyHolderInput, type CreatePolicyHolderInput } from '../schema';
import { updatePolicyHolder } from '../handlers/update_policy_holder';
import { eq } from 'drizzle-orm';

// Test data for creating initial policy holder
const testPolicyHolder: CreatePolicyHolderInput = {
  name: 'John Doe',
  policy_number: 'POL-2024-001',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  address: '123 Main St, Anytown, ST 12345',
  date_of_birth: new Date('1980-01-15')
};

describe('updatePolicyHolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a policy holder with all fields', async () => {
    // Create initial policy holder
    const created = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    const policyHolderId = created[0].id;

    // Update all fields
    const updateInput: UpdatePolicyHolderInput = {
      id: policyHolderId,
      name: 'Jane Smith',
      policy_number: 'POL-2024-002',
      email: 'jane.smith@example.com',
      phone: '+1-555-9876',
      address: '456 Oak Ave, Newtown, ST 67890',
      date_of_birth: new Date('1985-05-20')
    };

    const result = await updatePolicyHolder(updateInput);

    // Verify the result
    expect(result).toBeDefined();
    expect(result!.id).toEqual(policyHolderId);
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.policy_number).toEqual('POL-2024-002');
    expect(result!.email).toEqual('jane.smith@example.com');
    expect(result!.phone).toEqual('+1-555-9876');
    expect(result!.address).toEqual('456 Oak Ave, Newtown, ST 67890');
    expect(result!.date_of_birth).toEqual(new Date('1985-05-20'));
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // Create initial policy holder
    const created = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    const policyHolderId = created[0].id;
    const originalCreatedAt = created[0].created_at;

    // Update only name and email
    const updateInput: UpdatePolicyHolderInput = {
      id: policyHolderId,
      name: 'Updated Name',
      email: 'updated@example.com'
    };

    const result = await updatePolicyHolder(updateInput);

    // Verify the result
    expect(result).toBeDefined();
    expect(result!.id).toEqual(policyHolderId);
    expect(result!.name).toEqual('Updated Name');
    expect(result!.email).toEqual('updated@example.com');
    
    // Verify unchanged fields remain the same
    expect(result!.policy_number).toEqual('POL-2024-001');
    expect(result!.phone).toEqual('+1-555-0123');
    expect(result!.address).toEqual('123 Main St, Anytown, ST 12345');
    expect(result!.date_of_birth).toEqual(new Date('1980-01-15'));
    expect(result!.created_at).toEqual(originalCreatedAt);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated policy holder to database', async () => {
    // Create initial policy holder
    const created = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    const policyHolderId = created[0].id;

    // Update policy holder
    const updateInput: UpdatePolicyHolderInput = {
      id: policyHolderId,
      name: 'Database Updated Name',
      phone: '+1-555-7777'
    };

    await updatePolicyHolder(updateInput);

    // Verify changes are persisted in database
    const policyHolders = await db.select()
      .from(policyHoldersTable)
      .where(eq(policyHoldersTable.id, policyHolderId))
      .execute();

    expect(policyHolders).toHaveLength(1);
    expect(policyHolders[0].name).toEqual('Database Updated Name');
    expect(policyHolders[0].phone).toEqual('+1-555-7777');
    expect(policyHolders[0].email).toEqual('john.doe@example.com'); // Unchanged
    expect(policyHolders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent policy holder', async () => {
    const updateInput: UpdatePolicyHolderInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Update'
    };

    const result = await updatePolicyHolder(updateInput);

    expect(result).toBeNull();
  });

  it('should handle unique constraint violation for policy_number', async () => {
    // Create first policy holder
    const firstPolicyHolder = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    // Create second policy holder with different policy number
    const secondPolicyHolderData = {
      ...testPolicyHolder,
      policy_number: 'POL-2024-002',
      email: 'second@example.com'
    };

    const secondPolicyHolder = await db.insert(policyHoldersTable)
      .values(secondPolicyHolderData)
      .returning()
      .execute();

    // Try to update second policy holder with first policy holder's policy number
    const updateInput: UpdatePolicyHolderInput = {
      id: secondPolicyHolder[0].id,
      policy_number: 'POL-2024-001' // This should cause a unique constraint violation
    };

    // Should throw an error due to unique constraint
    await expect(updatePolicyHolder(updateInput)).rejects.toThrow(/unique/i);
  });

  it('should update date_of_birth field correctly', async () => {
    // Create initial policy holder
    const created = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    const policyHolderId = created[0].id;

    // Update date of birth
    const newDateOfBirth = new Date('1990-12-25');
    const updateInput: UpdatePolicyHolderInput = {
      id: policyHolderId,
      date_of_birth: newDateOfBirth
    };

    const result = await updatePolicyHolder(updateInput);

    expect(result).toBeDefined();
    expect(result!.date_of_birth).toEqual(newDateOfBirth);
    
    // Verify in database
    const dbRecord = await db.select()
      .from(policyHoldersTable)
      .where(eq(policyHoldersTable.id, policyHolderId))
      .execute();

    expect(dbRecord[0].date_of_birth).toEqual(newDateOfBirth);
  });

  it('should always update the updated_at timestamp', async () => {
    // Create initial policy holder
    const created = await db.insert(policyHoldersTable)
      .values(testPolicyHolder)
      .returning()
      .execute();

    const policyHolderId = created[0].id;
    const originalUpdatedAt = created[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with minimal change
    const updateInput: UpdatePolicyHolderInput = {
      id: policyHolderId,
      phone: '+1-555-9999'
    };

    const result = await updatePolicyHolder(updateInput);

    expect(result).toBeDefined();
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});