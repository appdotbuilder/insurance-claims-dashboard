import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums for claim types and status
export const claimTypeEnum = pgEnum('claim_type', ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'PROPERTY', 'LIABILITY']);
export const claimStatusEnum = pgEnum('claim_status', ['PENDING', 'APPROVED', 'REJECTED', 'INVESTIGATING', 'SETTLED']);

// Policy holders table
export const policyHoldersTable = pgTable('policy_holders', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  policy_number: text('policy_number').notNull().unique(), // Unique policy number
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  date_of_birth: timestamp('date_of_birth').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Insurance claims table
export const insuranceClaimsTable = pgTable('insurance_claims', {
  id: serial('id').primaryKey(),
  claim_id: text('claim_id').notNull().unique(), // Unique claim identifier
  policy_holder_id: integer('policy_holder_id').notNull().references(() => policyHoldersTable.id),
  date_filed: timestamp('date_filed').notNull(),
  claim_type: claimTypeEnum('claim_type').notNull(),
  status: claimStatusEnum('status').notNull().default('PENDING'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // Use numeric for monetary values
  description: text('description'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Define relations
export const policyHoldersRelations = relations(policyHoldersTable, ({ many }) => ({
  claims: many(insuranceClaimsTable),
}));

export const insuranceClaimsRelations = relations(insuranceClaimsTable, ({ one }) => ({
  policyHolder: one(policyHoldersTable, {
    fields: [insuranceClaimsTable.policy_holder_id],
    references: [policyHoldersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type PolicyHolder = typeof policyHoldersTable.$inferSelect; // For SELECT operations
export type NewPolicyHolder = typeof policyHoldersTable.$inferInsert; // For INSERT operations

export type InsuranceClaim = typeof insuranceClaimsTable.$inferSelect; // For SELECT operations
export type NewInsuranceClaim = typeof insuranceClaimsTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { 
  policyHolders: policyHoldersTable, 
  insuranceClaims: insuranceClaimsTable 
};