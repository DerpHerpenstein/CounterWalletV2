import CounterpartyV2 from "../api/CounterpartyV2.js";

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "dividend-sats-per-vb-slider"){
        const selectedFee = document.getElementById('dividend-selected-fee-rate');
        selectedFee.innerText = `${event.target.value}`
    }
    else if(event.target.id === "dividend-submit-tx-btn"){
        try{
            let result = await CounterpartyV2.dividendSatsPerVByte(
                walletProvider.walletAddress,                                   // source address
                document.getElementById('dividend-asset-quantity').value,       //asset quantity
                document.getElementById('dividend-selected-asset').innerText,   //asset to receive dividend
                document.getElementById('dividend-asset-to-give').value,       //asset to be given
                document.getElementById('dividend-sats-per-vb-slider').value,   // fee sats/vb
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