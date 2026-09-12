import CounterpartyV2 from "../api/CounterpartyV2.js";

// inject the shared fee selector (slider + custom fee input) into this page
document.getElementById('destroy-fee-selector').innerHTML = window.generateFeeSelectorHtml('destroy');

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "destroy-submit-tx-btn"){
        try{
            let result = await CounterpartyV2.destroySatsPerVByte(
                walletProvider.walletAddress,                                  // source address
                document.getElementById('destroy-selected-asset').innerText,   //asset name
                document.getElementById('destroy-asset-quantity').value,       //asset quantity
                window.getFeeSelectorValue('destroy'),                         // fee sats/vb
                document.getElementById('destroy-asset-tag').value,           //asset memo
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