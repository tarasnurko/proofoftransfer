help me brainshtorm. Currently Claim allows user to prove they did transacion on one chain and for 1 token. But this is not wery good flow. For  
 example there is claim "I Donated to charity X at least 10$ this in January". And this charity X can be donated to on multiple chains: Ethereum,  
 Base, Polygon etc. Even if it have same address on different EVM chains, tokens in which you transfer have different addreses, and of course  
 different chains have different transfers to this address. In other words I want to make such funcitonality, that claim contains:

- Chain Base, token 0x...0
- Chain Polygon, token 0x...1
- Chain Ethereum, token 0x...2

and user can donate tokens in easy for him way without bridging and doing other stuff just to prove he donated.

I though about functionality of just creating multiple claims, and user can select to which one he want to proof, be there is problem - you see  
 on which chain user did transfer, and if all other users did transfer on Ethereum chain and only you did transfer on Polygon then even though  
 noone see directly your address, one address that match constrains is yours - because there is no other transfers
