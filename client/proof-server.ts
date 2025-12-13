#!/usr/bin/env tsx
/**
 * Standalone Proof Generation Server
 *
 * This server runs separately from Next.js and handles ZK proof generation
 * using Noir circuits. It runs on port 3001 by default.
 *
 * Usage:
 *   tsx proof-server.ts
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { generateProof, proofToHex } from './src/utils/generateProof'
import { db } from './src/db'
import { proofs } from './src/db/schema'

const app = express()
const PORT = process.env.PROOF_SERVER_PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.post('/generate-proof', async (req, res) => {
  try {
    const {
      addressCommitment,
      message,
      tokenAddress,
      receiverAddress,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      signature,
      messageHash,
      senderAddress,
      salt,
      publicKeyX,
      publicKeyY,
      allTransfers,
      proverTransfers,
    } = req.body

    console.log('🔄 Received proof generation request')
    console.log(`   Sender: ${senderAddress}`)
    console.log(`   Recipient: ${receiverAddress}`)
    console.log(`   Token: ${tokenAddress}`)
    console.log(`   Transfers: ${proverTransfers?.length || 0}`)
    if (proverTransfers?.length > 0) {
      console.log(`   Transfer amounts:`, proverTransfers.map((t: any) => t.value))
    }
    console.log(`   Raw minAmount from request:`, minAmount, typeof minAmount)
    console.log(`   Raw maxAmount from request:`, maxAmount, typeof maxAmount)
    console.log(`   Will use maxAmount:`, maxAmount || '1000000000000000000000000000000')

    const logs: string[] = []
    const addLog = (msg: string) => {
      logs.push(msg)
      console.log(`   ${msg}`)
    }

    // Generate the actual ZK proof using Noir circuit
    addLog('Starting ZK proof generation... ⏳')

    const { proof, publicInputs } = await generateProof(
      {
        senderAddress,
        salt,
        addressCommitment,
        publicKeyX,
        publicKeyY,
        signature,
        messageHash,
        allTransfers: allTransfers || proverTransfers,
        proverTransfers,
        tokenAddress,
        receiverAddress,
        startDate,
        endDate,
        minAmount: minAmount || '0',
        maxAmount: maxAmount || '1000000000000000000000000000000', // 1e30 - very safe for u128
      },
      addLog
    )

    const proofHex = proofToHex(proof)
    addLog('ZK proof generated successfully ✅')

    // Store proof in database
    addLog('Storing proof in database... ⏳')

    const [newProof] = await db
      .insert(proofs)
      .values({
        recipient: receiverAddress,
        tokenAddress,
        startDate: new Date(startDate * 1000),
        endDate: new Date(endDate * 1000),
        minAmount: minAmount || '0',
        maxAmount: maxAmount || '1000000000000000000000000000000', // 1e30 - very safe for u128
        proof: proofHex,
        publicInputs: JSON.stringify(publicInputs),
        globalTransfersRoot: publicInputs[0],
        addressCommitment: addressCommitment,
        messageHash: messageHash,
        message: message || null,
      })
      .returning()

    addLog(`Proof stored with ID: ${newProof.id} ✅`)

    console.log('✅ Proof generation completed successfully')

    res.json({
      success: true,
      proofId: newProof.id,
      logs,
      proofData: proofHex,
      publicInputs,
    })
  } catch (error: any) {
    console.error('❌ Proof generation failed:', error)
    res.status(500).json({
      error: error.message || 'Failed to generate proof',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'proof-generation-server' })
})

app.listen(PORT, () => {
  console.log('🚀 Proof Generation Server started')
  console.log(`   Port: ${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/health`)
  console.log(`   Endpoint: http://localhost:${PORT}/generate-proof`)
  console.log('')
})
