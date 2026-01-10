# Circut

## Circut input

1. Group constraints

- Token address
- Recipient address
- ?From Date
- ?To Date
- ?Min token transfers sum
- ?Max token transfers sum

? is optional parameter

2. Public data

- Ethereum transfers as merkle tree

3. Group data

- group id
- group title

4. Private data

- signed by user group id + group title

5. Data to return

- hash(signed by user group id + group title, groupId, groupTitle)

## Transfer merkle tree

Each leaf is poseidon hash of (from, to, token, amount)

# Backend

user passes group id, and signed message
backend creates proof and verifies it
from result nullifier is returned and saved to db
