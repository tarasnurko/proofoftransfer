import { z } from 'zod'

export const submitProofSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),

  nullifier: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{1,66}$/, 'Invalid nullifier format'),

  proofData: z.string().min(1, 'Proof data is required'),

  publicInputs: z
    .record(z.any())
    .refine((val) => Object.keys(val).length > 0, {
      message: 'Public inputs are required',
    }),

  transfersRootHash: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{1,66}$/, 'Invalid root hash format'),

  proverAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
    .optional()
    .transform((val) => val?.toLowerCase()),
})

export type SubmitProofInput = z.infer<typeof submitProofSchema>
