I want to redesign app because there is currently still errors with datepicker and other components and layout, and I dont really like current
design  
 for that you need to describe app structure, pages layout, components, forms, etc so I can give this md file and v0 AI would give me design so
then I can give you those files and you will connect functionality to them.

for example

## General Pages Layout

There is header on top of every page. On left side there is "PROOF OF TRANSFER" like logo (text). Also header contains actions buttons: "All  
 Claims" which links to main page, create claim which redirects to create claim page, connect wallet chich allows you to connect evm wallet,  
 and theme switcher

## Main page

main page have title with subtitle  
 also there is grid of claim cards with it's details, and button which redirects to cleim details page  
 claim data includes: ...

## Create claim page

create claim page contains inputs for  
 claim message, chain select, token address, recipient address, min transfer amount ....

## Claim details page

On claim details page users can see claim details, and generated proofs for this claim. Proof has next data... To generate proof on this page  
 user need firstly to conect wallet, then they can generate proof which would ... And while proof is generating they see progress...

there is such routes:  
 page.tsx  
 claims/[id]/page.tsx  
 create/

and so on

you need to generate all details so AI know which fields and where to add, you need to describe all necessary comopnents, but you don not  
 describe exact styles or where each component should be placed

add this to '/Users/tarasnurko/prog/proj/proofoftransfer/docs' in md format
