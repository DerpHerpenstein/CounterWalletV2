import CounterpartyV2 from "../api/CounterpartyV2.js";

// inject the shared fee selector (slider + custom fee input) into this page
document.getElementById('airdrop-fee-selector').innerHTML = window.generateFeeSelectorHtml('airdrop');

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "airdrop-submit-tx-btn"){
        try{
            let destinations = document.getElementById('airdrop-destination-address').value;
            // make sure we can split whitespace new line or comma deliniations
            let destinationsArray = destinations.split(/[\s,]+/).filter(dest => dest.length > 0);//split(",");
            console.log(destinationsArray);
            let totalLength = destinationsArray.length
            let selectedAsset = document.getElementById('airdrop-selected-asset').innerText;
            let quantity = document.getElementById('airdrop-asset-quantity').value;
            // added normalizion for MPMA single asset airdrops
            quantity = await CounterpartyV2.normalizeToSatsIfNeeded(selectedAsset,quantity);

            // repeat the asset and quantites then remove the last comma
            let finalAssets =(selectedAsset + ",").repeat(totalLength).slice(0, -1);
            let finalQuantities = (quantity + ",").repeat(totalLength).slice(0, -1);
            let finalDestinations = destinationsArray.join(",");


            let result = await CounterpartyV2.mpmaSatsPerVByte(
                walletProvider.walletAddress,                                   // source address
                finalDestinations,                                              // destination addresses
                finalAssets,                                                    //asset names
                finalQuantities,                                                //asset quantity
                window.getFeeSelectorValue('airdrop'),                          // fee sats/vb
                document.getElementById('airdrop-asset-memo').value,            //asset memo/s
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