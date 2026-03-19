import { z } from 'zod'

export const submitProofSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),

  nullifier: z
    .string()
    .regex(/^0x[a-fA-F0-9]{1,64}$/, 'Invalid nullifier format')
    .transform(v => v.toLowerCase()),

  proofData: z.string().min(1, 'Proof data is required').max(2_000_000),

  publicInputs: z
    .array(z.string().max(200))
    .min(1, 'Public inputs are required')
    .max(50),

  message: z.string().max(500).optional(),
})

export type SubmitProofInput = z.infer<typeof submitProofSchema>
