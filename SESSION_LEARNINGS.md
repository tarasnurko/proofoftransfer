# Session Learnings: EIP-712 Circuit Implementation

Date: 2026-02-01
Task: Update Noir circuit for EIP-712 typed data signing and fix proof verification

## Critical Mistakes & Solutions

### 1. **Using `sed` for Code Cleanup**

**Problem:**
- Used `sed -i '' '/console\.log/d'` to remove debug console.log statements
- This removed entire lines, including console.log/warn/error statements
- Left orphaned object literal properties and broke code structure
- Result: Multiple TypeScript compilation errors like "Expected ';', '}' or <eof>"

**Why it failed:**
- Console.log statements were part of larger expressions (object properties, if statements)
- Sed doesn't understand JavaScript/TypeScript syntax or context
- Removing lines blindly broke object literals and control flow structures

**Correct approach:**
```typescript
// BAD - leaves orphaned code
if (invalidTransfers.length > 0) {
  console.warn('message', {
    expectedRecipient: recipientAddress,  // <-- orphaned after sed removes console.warn
    expectedToken: tokenAddress,
  })
}

// GOOD - manually convert to proper error handling
if (invalidTransfers.length > 0) {
  throw new Error(`Found ${invalidTransfers.length} transfers that don't match claim parameters`)
}
```

**Solution:**
- Use Edit tool to manually remove each console.log
- Convert validation console.warn/error to proper `throw new Error()`
- Review each statement's context before removing
- Keep code structure intact

**Key Learning:** Never use sed/awk for removing code that might be part of expressions. Always use syntax-aware tools or manual editing.

---

### 2. **Git Restore Lost All Progress**

**Problem:**
- After sed broke the code, ran `git checkout apps/web/src/lib/proof-generator.ts` to restore
- This restored the file BUT also reverted all previous fixes:
  - publicInputs verification fix (returning Noir array)
  - chainId fixes
  - UUID to bytes32 conversion fixes
  - All EIP-712 integration work

**Why it happened:**
- The file had unstaged changes (my recent fixes)
- `git checkout` reverts to the last committed state
- All unstaged work was lost

**Better approach:**
1. **Before restoring:** Create a backup of working changes
   ```bash
   cp proof-generator.ts proof-generator.ts.backup
   ```

2. **Or use git stash:** Preserve changes while cleaning
   ```bash
   git diff > my-changes.patch  # Save changes
   git checkout proof-generator.ts  # Restore
   git apply my-changes.patch  # Re-apply selectively
   ```

3. **Or use Edit tool to fix:** Instead of restoring, fix the sed damage with Edit tool

**Solution:**
- Had to re-apply all fixes manually by reading the summary
- Re-implemented publicInputs fix
- Re-removed all console.log statements carefully

**Key Learning:** Before running destructive git commands, always save your work. Consider stash or patch files. Better yet, avoid getting into situations requiring restore.

---

### 3. **Misunderstanding Public Inputs Structure**

**Problem:**
- Circuit outputs 11 public inputs (all circuit public parameters)
- I was returning only 4 formatted values in `publicInputs` object
- Verification function `verifyProofClient()` expects the full Noir array
- Result: "Proof verification failed!" even though proof was valid

**Why it happened:**
- Assumed verification only needs a subset of public inputs
- Didn't realize Noir verification requires the COMPLETE array in exact order
- Confused "public inputs for verification" with "public inputs for display"

**Correct understanding:**
```typescript
// Noir circuit outputs (11 values total):
// [claim_id, claim_message_hash, token_address, recipient_address,
//  chain_id, min_sum, max_sum, from_timestamp, to_timestamp,
//  transfers_root_hash, nullifier]

// WRONG - verification fails
return {
  publicInputs: {
    claim_id: '...',
    token_address: '...',
    recipient_address: '...',
    transfers_count: 5
  }
}

// CORRECT - verification succeeds
return {
  publicInputs: publicInputs,  // Original Noir array (all 11 values)
  publicInputsFormatted: {      // Custom object for display
    claim_id: '...',
    token_address: '...',
    recipient_address: '...',
    transfers_count: 5
  }
}
```

**Solution:**
- Return both the original Noir array AND a formatted version
- Use original array for `verifyProofClient()`
- Use formatted object for displaying to user

**Key Learning:** ZK proof verification requires exact public inputs array as output by the circuit. Never truncate or reformat verification inputs.

---

### 4. **Approach to Debug Log Removal**

**Problem:**
- Wanted to remove "unnecessary" console.log statements
- Tried automated approach (sed) which failed catastrophically
- Had to figure out which logs to remove vs convert to errors

**Better approach - Categorize first:**

1. **Remove entirely** - Pure debug logs with no validation purpose:
   ```typescript
   console.log('Merkle tree info:', { ... })
   console.log('First transfer:', { ... })
   ```

2. **Convert to errors** - Validation logs that catch problems:
   ```typescript
   // Before
   if (!valid) {
     console.warn('Validation failed!', details)
   }

   // After
   if (!valid) {
     throw new Error('Validation failed')
   }
   ```

3. **Keep** - Critical state logs (none in this case for production):
   ```typescript
   // Might keep in debug mode
   console.error('Circuit constraint violation:', details)
   ```

**Process:**
1. Read through all console.log/warn/error statements
2. Categorize each one
3. Manually edit each category appropriately
4. Test after each major section

**Key Learning:** Before removing debug code, categorize it by purpose. Some should become errors, some should be removed, some might stay. Never bulk-remove.

---

### 5. **Not Reading Summary Carefully Enough**

**Problem:**
- Summary contained exact fixes needed (publicInputs change)
- Still had to re-discover some details by trial
- Wasted time re-implementing what was already documented

**What summary said:**
> Changed return to include both publicInputs arrays:
> ```typescript
> return {
>   proofData: uint8ArrayToHex(proof),
>   publicInputs: publicInputs, // Original array from Noir for verification
>   publicInputsFormatted: { ... },
> }
> ```

**What I should have done:**
1. Read summary completely before starting
2. Extract exact changes needed
3. Apply them directly without re-thinking
4. Verify they work

**What I actually did:**
1. Skimmed summary
2. Started fixing
3. Re-discovered issues
4. Eventually arrived at same solution as summary

**Key Learning:** When resuming from summary, trust the summary. It contains the exact solutions that already worked. Apply them first, then verify.

---

## Thinking Process Improvements

### Better Workflow for Code Cleanup

**Old approach:**
1. Identify issue (too many console.logs)
2. Try automated solution (sed)
3. Break everything
4. Panic and restore
5. Lose all work
6. Start over

**New approach:**
1. Identify issue
2. **Assess risk** - Could automation break things?
3. If risky, use manual approach
4. Work incrementally (few changes → test → repeat)
5. Commit working state before major changes
6. If using automation, test on copy first

### Better Error Recovery Strategy

**When things break:**

1. **Don't immediately restore from git**
   - First assess: What broke? Can I fix it with Edit?
   - Can I salvage parts of my work?

2. **If must restore:**
   - Save current changes: `git diff > backup.patch`
   - Or copy file: `cp file.ts file.ts.backup`
   - Then restore: `git checkout file.ts`
   - Re-apply selectively from backup

3. **Prevention:**
   - Commit working states more frequently
   - Use git branches for experiments
   - Test changes incrementally

### Better Verification Understanding

**For ZK circuits:**
- Circuit outputs = public inputs array (exact format, exact order)
- Verification requires COMPLETE array, not subset
- You can format/display differently, but keep original for verification
- Always return both: `publicInputs` (array) and `publicInputsFormatted` (object)

**For TypeScript interfaces:**
- Update interface FIRST before changing return type
- Ensures type safety catches issues early
- Prevents runtime errors from mismatched types

---

## Quick Reference: What Worked

### Removing Console Logs
```typescript
// ✅ Manual Edit tool with proper error handling
if (invalidTransfers.length > 0) {
  throw new Error(`Found ${invalidTransfers.length} transfers`)
}

// ❌ Automated sed/awk
sed -i '' '/console\.log/d' file.ts  // NEVER DO THIS
```

### Preserving Work Before Destructive Commands
```bash
# ✅ Create safety net
git diff > my-work.patch
cp file.ts file.backup.ts

# Then restore if needed
git checkout file.ts

# ❌ Direct restore without backup
git checkout file.ts  # Loses all unstaged work
```

### Returning ZK Proof Data
```typescript
// ✅ Return both formats
return {
  publicInputs: publicInputs,        // Original Noir array
  publicInputsFormatted: { ... }     // Human-readable object
}

// ❌ Return only formatted
return {
  publicInputs: { ... }  // Verification will fail
}
```

---

## Summary of Session Success

Despite the mistakes, the session was ultimately successful:

1. ✅ Implemented EIP-712 typed data signing in circuit
2. ✅ Fixed publicInputs verification issue
3. ✅ Removed all debug console.log statements
4. ✅ Converted validation logs to proper error handling
5. ✅ Build passes successfully
6. ✅ All 20 circuit tests passing (from previous work)

**Time lost to mistakes:** ~30 minutes (sed disaster + recovery)
**Time saved by learning:** Future sessions should be faster by avoiding these pitfalls

---

## Action Items for Future Sessions

1. **Never use sed/awk for code removal** - Use Edit tool
2. **Always backup before git restore** - Use patches or copies
3. **Read summaries completely** - Trust documented solutions
4. **Categorize before bulk changes** - Not all console.logs are equal
5. **Understand verification requirements** - ZK circuits need complete public inputs
6. **Test incrementally** - Don't make many changes at once
7. **Commit working states** - More frequent commits = less lost work
