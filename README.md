# Transferproover

App to proove that you have made ERC20 transfer in between dates D1 and D2, with specified token T, to recipient R, and where the sum of your token transfer is between S1 to S2.

This may be usefull when you need to prove you have made transfers to specified address but dont want anyone to know your wallet address. Because anyone can see all transfers and "calculate and identify" from specified amount of tokens your wallet address user specifies S1 and S2 amount of tokens transfered instead of exact one so it would much more harder to identify exact wallet which made transfers.

Usecases

- proof you have donated at least tokens
- proof you transfered tokens to fried that collect funds to buy present to other friend Bob. For example there are 10 people in group, and each need to send 1$, you dont want to share yours, and noone knows each others walet. So everyone generate proof to friend Bob that everyone who send tokens are those guys.

# How Does it work

User specifies public data like tokens recipient, transfered token, date from and to which transfers are made, and min/max values for sum of transfered tokens (sum of tokens is at least min and at most max).
Then transfers are retrieved using etherscan api.
Then those transfers are hashed and used as leaves of merkle tree. This merkle tree is also public input.
To retrieve user token transfers we need to retrieve user's wallet address by extracting it from signature. Then we filter user transfers and pass those transfers as private inputs to circut. In circut those transfers are checked (for min/max transfered sum), hashed into leaves and checked that they are in fact part of merkle tree. Circut also checks signature (which is also private input) - so that client which made transfers is the one who made transfers. Because we can not share user address (whole purpose of app) when creating proof user need to provide other public input - string that must show other users that proof was created specifically for some group of people (or for one people) so verifiers can identify user.
