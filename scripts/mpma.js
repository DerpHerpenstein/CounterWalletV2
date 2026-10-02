import CounterpartyV2 from "../api/CounterpartyV2.js";

// inject the shared fee selector (slider + custom fee input) into this page
document.getElementById('mpma-fee-selector').innerHTML = window.generateFeeSelectorHtml('mpma');



// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    function parseDelimitedData(input) {
        // Split by newlines and filter out empty lines
        const lines = input.trim().split(/\r?\n/).filter(line => line.trim());
        
        // Split each line by comma, space, or tab
        const parsedData = lines.map(line => {
            // Split by comma, space, or tab (whitespace)
            const parts = line.trim().split(/[, \t]+/);
            return {
                asset: parts[0],
                destination: parts[1],
                quantity: parts[2]
            };
        });
        
        // Extract into separate arrays
        const destinations = parsedData.map(item => item.destination);
        const assets = parsedData.map(item => item.asset);
        const quantities = parsedData.map(item => item.quantity);
        
        return {
            destinations,
            assets,
            quantities
        };
    }


    if(event.target.id === "mpma-submit-tx-btn"){
        try{
            // v11.5.0 taproot encoding only supports P2WPKH (bc1q) and P2TR (bc1p) sources
            if(!(walletProvider.walletAddress.includes("bc1q") || walletProvider.walletAddress.includes("bc1p"))){
                throw new Error("MPMA requires a Native SegWit (bc1q) or Taproot (bc1p) address");
            }
            let mpmaData= parseDelimitedData(document.getElementById('mpma-asset-csv').value)
            let result = await CounterpartyV2.mpmaSatsPerVByte(
                walletProvider.walletAddress,                               // source address
                mpmaData.destinations,                                      // destination addresses
                mpmaData.assets,                                            //asset names
                mpmaData.quantities,                                        //asset quantity
                window.getFeeSelectorValue('mpma'),                         // fee sats/vb
                document.getElementById('mpma-asset-memos').value,          //asset memo/s  for now just a single memo!
                "False",                                                    // memo is hex
                "None",                                                     // memos
                "False",                                                    // memos are hex
                walletProvider.publicKey || null                            // source pubkey for taproot envelope
            );
            
            // Transaction submission modal
            let txData = result.result;
            window.prepareSignAndBroadcastPSBT(txData);
        }
        catch(e){
            generalModal.openError("Error composing transaction", e);
        }
        
    }
});