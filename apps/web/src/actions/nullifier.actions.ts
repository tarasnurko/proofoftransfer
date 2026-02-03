'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { getProofsByNullifier } from '@/db/queries/proofs'

const nullifierSchema = z.object({
  nullifier: z.string().min(1, 'Nullifier is required'),
})

export const getMyProofsAction = actionClient
  .inputSchema(nullifierSchema)
  .action(async ({ parsedInput }) => {
    const proofs = await getProofsByNullifier(parsedInput.nullifier)
    return { proofs }
  })
