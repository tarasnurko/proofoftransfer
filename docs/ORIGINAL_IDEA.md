# Original Idea Recap

## Core Concept

Prove you transferred tokens to a user without revealing your address.

## Single Source of Truth

Etherscan API - shows transfers for recipient in specified token in specified date range.

## Claims

User creates a "claim" - group with constraints that everybody sees. With these constraints user did transfer(s). Claim message specifies what the claim is.

### Examples

1. **Birthday Gift**: "Transfers to X.Y. friend 10$ on birthday"
   - None of friends know each other's wallets
   - They can see that all transferred to friend as birthday present

2. **Raffle Donation**: "Donate at least 5$ to X to participate in raffle Y"
   - Collect money via donations
   - Encourage donations by rewarding random participant with prize
   - No one sees who donated how much or when
   - But you see person donated because they proved it

## Claim Creation Flow

1. Claim created with specified constraints
2. Transfers matching constraints fetched via Etherscan API
3. Merkle tree created and saved (avoid recreating every time)
4. Transfers saved to DB (avoid refetching for details view)

## Proof Generation

User can make "proof" they have transfer for claim conditions:

1. Connect wallet
2. Press "generate proof"
3. Proof stored to DB

## Nullifier System

User can create proof for claim only once. When user creates signed message for proof:

- Hash message to retrieve nullifier
- Nullifier unique per user per claim, and per claim per user

### Duplicate Proof Detection

When user creates second proof:

- Either: don't save to DB (nullifier already exists)
- Or: mark that nullifier created X proofs

**Why needed**: User can create unlimited proofs for a claim. If only 1 transfer exists:

- User who did transfer creates second proof
- Gives proof to another person
- That person shows proof to "participate in raffle"
- But second person never transferred - should not have proof

## Visibility

Any user can:

- See all claims
- See all proofs
- See how many proofs each nullifier created in claim

### User's Own Proofs

To see their proofs in claim:

1. Go to claim page
2. "Sign message" to receive their nullifier
3. Filter by nullifier field
4. Shows only user's proof(s)

you can prove that you have transfered tokens to user without sharing in any way you address. For this there need to be single source of truth  
 that shows transfers for recipient in specified token in speicified date range - etherscan api  
 you did transfer. then week passed you create "claim" - i.e. group with constraints, that everybody see, and with this constraints you did  
 transfer (transfers). In claim message you need to specify what claim is that. For example

- "Transfers to X.Y. friend 10$ on birthday" - none of friends know each-ones wallet, but they can see that all transfered to friend as  
  birthday present
- "Donate at least 5$ to X to participate in raffle Y" - claim for raffle participation. For example you need to collect a lot of money via  
  donations, and to encourage donations, you can reward some random participant with prize. And again noone can see who donated how much or  
  when, but you see that person donated because they proved that  


so when claim is created - transfers with specified in claim constraints are fetched using etherscan api. Then merkle tree is created and  
 saved (to not create it every time). And transfers also should be saved to db to not fetch every time when user want to see details

then any user can make 'proof' that they have transfer for this claim conditions. They connect wallet, and press "generate proof" which  
 generates proof. Then this proof is stored to db. But user can create proof for claim only once\* because we are using nullifiers - when user  
 created signed message to to create proof, we hash this message and from it we retrieve nullifier - this nullifier is unique for each user in  
 claim, and for each claim for user. So when user will create second proof we should either not save it to db because we see in db that there  
 is already proof with same nullifier, or we should mark that this nullifier created X proofs so any user can see some user want to "duplicate  
 and share their proof as proof of other person transfer" or something like that. It's necessary because user can create as many proofs as they  
 want for claim, and for example there is only 1 transfer in blockchain, but this user that did transfer can create second proof, give this  
 proof to some other user, and this user will show this proof to "watcher" to for example "participate in raffle", but this second person never  
 did transfer, they should not have any proof

so in general any user can see all claims, all proofs, can see how much each user created (nullifier was used in) proofs in claim. And if user  
 want, he can see their proofs in claim if they on page claim "sign message" to recieve their nullifier, and then filter by that field  
 (nullifier) entities to show user only his proof(proofs)
