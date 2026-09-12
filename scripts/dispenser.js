import CounterpartyV2 from "../api/CounterpartyV2.js";

// inject the shared fee selector (slider + custom fee input) into this page
document.getElementById('dispenser-fee-selector').innerHTML = window.generateFeeSelectorHtml('dispenser');

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "dispenser-submit-tx-btn"){
        try{
            let satsSalePrice = parseInt(parseFloat(document.getElementById('dispenser-asset-price-btc').value)*1e8);
            console.log(satsSalePrice);
            let result = await CounterpartyV2.dispenserUpdateSatsPerVByte(
                walletProvider.walletAddress,                                    // source address
                document.getElementById('dispenser-selected-asset').innerText,   //asset name
                document.getElementById('dispenser-asset-give-quantity').value,        //asset give quantity
                document.getElementById('dispenser-asset-escrow-quantity').value,      //asset escrow quantity
                satsSalePrice,                                                   //asset price in btc
                0,                                                               // open dispenser, 0 for open 10 for closed
                window.getFeeSelectorValue('dispenser'),                         // fee sats/vb
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