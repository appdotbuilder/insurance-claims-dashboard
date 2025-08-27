import { z } from 'zod';

// Enums for claim types and status
export const claimTypeEnum = z.enum(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'PROPERTY', 'LIABILITY']);
export const claimStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'INVESTIGATING', 'SETTLED']);

// Policy holder schema
export const policyHolderSchema = z.object({
  id: z.number(),
  name: z.string(),
  policy_number: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  date_of_birth: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PolicyHolder = z.infer<typeof policyHolderSchema>;

// Insurance claim schema
export const insuranceClaimSchema = z.object({
  id: z.number(),
  claim_id: z.string(), // Unique claim identifier (e.g., CLM-2024-001)
  policy_holder_id: z.number(),
  date_filed: z.coerce.date(),
  claim_type: claimTypeEnum,
  status: claimStatusEnum,
  amount: z.number(), // Claim amount
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type InsuranceClaim = z.infer<typeof insuranceClaimSchema>;

// Input schema for creating policy holders
export const createPolicyHolderInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  policy_number: z.string().min(1, 'Policy number is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  date_of_birth: z.coerce.date()
});

export type CreatePolicyHolderInput = z.infer<typeof createPolicyHolderInputSchema>;

// Input schema for updating policy holders
export const updatePolicyHolderInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  policy_number: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.coerce.date().optional()
});

export type UpdatePolicyHolderInput = z.infer<typeof updatePolicyHolderInputSchema>;

// Input schema for creating insurance claims
export const createInsuranceClaimInputSchema = z.object({
  claim_id: z.string().min(1, 'Claim ID is required'),
  policy_holder_id: z.number().positive('Valid policy holder ID is required'),
  date_filed: z.coerce.date(),
  claim_type: claimTypeEnum,
  status: claimStatusEnum.default('PENDING'),
  amount: z.number().positive('Claim amount must be positive'),
  description: z.string().nullable().optional()
});

export type CreateInsuranceClaimInput = z.infer<typeof createInsuranceClaimInputSchema>;

// Input schema for updating insurance claims
export const updateInsuranceClaimInputSchema = z.object({
  id: z.number(),
  claim_id: z.string().min(1).optional(),
  policy_holder_id: z.number().positive().optional(),
  date_filed: z.coerce.date().optional(),
  claim_type: claimTypeEnum.optional(),
  status: claimStatusEnum.optional(),
  amount: z.number().positive().optional(),
  description: z.string().nullable().optional()
});

export type UpdateInsuranceClaimInput = z.infer<typeof updateInsuranceClaimInputSchema>;

// Schema for getting claims by policy holder
export const getClaimsByPolicyHolderInputSchema = z.object({
  policy_holder_id: z.number().positive('Valid policy holder ID is required')
});

export type GetClaimsByPolicyHolderInput = z.infer<typeof getClaimsByPolicyHolderInputSchema>;

// Schema for getting single policy holder
export const getPolicyHolderInputSchema = z.object({
  id: z.number().positive('Valid policy holder ID is required')
});

export type GetPolicyHolderInput = z.infer<typeof getPolicyHolderInputSchema>;

// Schema for getting single claim
export const getClaimInputSchema = z.object({
  id: z.number().positive('Valid claim ID is required')
});

export type GetClaimInput = z.infer<typeof getClaimInputSchema>;

// Extended claim schema with policy holder information for dashboard views
export const claimWithPolicyHolderSchema = z.object({
  id: z.number(),
  claim_id: z.string(),
  policy_holder_id: z.number(),
  date_filed: z.coerce.date(),
  claim_type: claimTypeEnum,
  status: claimStatusEnum,
  amount: z.number(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  policy_holder: policyHolderSchema
});

export type ClaimWithPolicyHolder = z.infer<typeof claimWithPolicyHolderSchema>;