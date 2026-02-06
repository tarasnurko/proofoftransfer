import { z } from 'zod'

export const submitProofSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),

  nullifier: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{1,66}$/, 'Invalid nullifier format'),

  proofData: z.string().min(1, 'Proof data is required'),

  publicInputs: z
    .array(z.string())
    .min(1, 'Public inputs are required'),

  transfersRootHash: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{1,66}$/, 'Invalid root hash format'),
})

export type SubmitProofInput = z.infer<typeof submitProofSchema>
