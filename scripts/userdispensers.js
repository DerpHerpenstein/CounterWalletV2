import CounterpartyV2 from "../api/CounterpartyV2.js";

const urlParams = new URLSearchParams(window.location.search);
const title = urlParams.get("t");
const subtitle = urlParams.get("s");
const dispenserAddresses = urlParams.get("d") ? urlParams.get("d").split(",") : [];
let userDispenserData = [];

document.getElementById("userdispensers-title").innerText = escapeHtml(title);
document.getElementById("userdispensers-subtitle").innerText = escapeHtml(subtitle);

//    http://127.0.0.1:8080/?page=userdispensers&t=TitleData&s=SubtitleData&d=bc1qa4hh20ae25yscge7g6ph6mdxl3tapqjlztwx0r,bc1q7787j6msqczs58asdtetchl3zwe8ruj57p9r9y,1FDVTNiW4eWK5w7SDjsJVbRabjF3uDPJ6A


const updateUserDispensers = async () => {
    for(let i=0; i<dispenserAddresses.length; i++){
        let tmpData = await CounterpartyV2.getDispensers(dispenserAddresses[i],1);
        userDispenserData.push(...tmpData.result)
    }

    document.getElementById('userdispensers-dispenser-data').innerHTML = "";
    for(let i=0; i< userDispenserData.length; i++){
        let propertyHtml = window.generatePropertyDisplayHtml("userdispensers-"+userDispenserData[i].tx_hash, userDispenserData[i], ["give_quantity_normalized","give_remaining_normalized","satoshirate_normalized","escrow_quantity_normalized"]);
        document.getElementById('userdispensers-dispenser-data').innerHTML += 
            `<div class="userdispensers-card glass-card rounded-xl overflow-hidden border border-border-color relative">
                <div class="p-2">
                    <h4>Asset: ${window.escapeHtml(userDispenserData[i].asset)}</h4>
                    ${propertyHtml}
                    <button data-asset="${window.escapeHtml(userDispenserData[i].asset)}"
                            data-source="${window.escapeHtml(userDispenserData[i].source)}"
                            data-givequantitynormalized="${window.escapeHtml(userDispenserData[i].give_quantity_normalized)}"
                            data-escrowquantitynormalized="${window.escapeHtml(userDispenserData[i].escrow_quantity_normalized)}"
                            data-giveremainingnormalized="${window.escapeHtml(userDispenserData[i].give_remaining_normalized)}"
                            data-satoshiratenormalized="${window.escapeHtml(userDispenserData[i].satoshirate_normalized)}"
                            data-satoshirate="${window.escapeHtml(userDispenserData[i].satoshirate)}"
                        class="userdispensers-buy-btn btn-primary px-6 py-3 rounded-lg flex items-center justify-center">
                        Buy
                    </button>
                </div>
            </div>`
            
    }
}
// if we have a dispenser list, show it
if(dispenserAddresses.length > 0){
    document.getElementById('userdispensers-buy-section').classList.remove("hidden");
    updateUserDispensers();
}
// otherwise show the create section
else{
    document.getElementById('userdispensers-create-section').classList.remove("hidden");
}


document.getElementById('general-modal').addEventListener('click', async function(event) {
    if(event.target.id === "userdispensers-sats-per-vb-slider"){
        const selectedFee = document.getElementById('userdispensers-selected-fee-rate');
        selectedFee.innerText = `${event.target.value}`
    }
})

document.getElementById('main').addEventListener('click', async function(event) {
    const buyDispenser = async() =>{
        try{
            let quantity = parseFloat(document.getElementById('userdispensers-buy-quantity').value);
            let satoshirate = parseInt(document.getElementById('userdispensers-satoshirate').innerText);
            let finalValue = Math.ceil(quantity*satoshirate);

            let source = document.getElementById('userdispensers-buy-source').innerText;
            let result = await CounterpartyV2.dispenserBuySatsPerVByte(
                walletProvider.walletAddress,                   //source address
                source,                                         // dispenser address
                finalValue,                                       //quantity
                document.getElementById('userdispensers-sats-per-vb-slider').value,   // fee sats/vb
            );
            
            // Transaction submission modal
            let txData = result.result;
            window.prepareSignAndBroadcastPSBT(txData);
        }
        catch(e){
            generalModal.openError("Error composing transaction", e);
        }
    }
    if(event.target.classList.contains('userdispensers-create-btn')){
        let tmpTitle = document.getElementById('userdispensers-create-title').value;
        let tmpSubtitle = document.getElementById('userdispensers-create-subtitle').value;
        let tmpDispenserAddresses = document.getElementById('userdispensers-dispenser-addresses').value;
        let tmpDispenserArray = tmpDispenserAddresses.split(/[\s,]+/).filter(dest => dest.length > 0);
        let paramsObj = {
            page: "userdispensers",
            t: tmpTitle,
            s: tmpSubtitle,
            d: tmpDispenserArray
        }

        const params = new URLSearchParams(paramsObj);
        const urlWithParams = window.location.origin + window.location.pathname + "?" + params.toString();
        
        console.log(urlWithParams);
        window.generalModal.openNoButtons(`
            <div class="mb-6">
                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">URL</label>
                    <div class="flex space-x-2">
                        <p id="userdispensers-buy-source" class="overflow-y-auto text-wrap break-words">${escapeHtml(urlWithParams)}</p>
                    </div>
                </div>
                <div class="flex gap-4 pt-4 border-t border-border-color justify-end">
                <button data-copydata="${escapeHtml(urlWithParams)}"
                        onclick="copyToClipboard(this); return false;"
                        class="userdispensers-create-btn btn-primary px-6 py-3 rounded-lg flex">
                    <i class="fas fa-copy mr-2"></i> Copy URL
                </button>
            </div>
            </div>
            
        `,"Dispenser List Created");
    }
    // if the user clicks a dispense buy-btn, we need to open the userdispensers-buy modal
    else if(event.target.classList.contains('userdispensers-buy-btn')){
        window.generalModal.open(`
            <div class="mb-6">
                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Dispenser Source</label>
                    <div class="flex space-x-2">
                        <p id="userdispensers-buy-source">${escapeHtml(event.target.dataset.source)}</p>
                    </div>
                </div>

                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Price</label>
                    <div class="flex space-x-2">
                        <p>${escapeHtml(event.target.dataset.satoshiratenormalized)}</p>
                        <p id="userdispensers-satoshirate" hidden>${escapeHtml(event.target.dataset.satoshirate)}</p>
                    </div>
                </div>

                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Give Remaining</label>
                    <div class="flex space-x-2">
                        <p>${escapeHtml(event.target.dataset.giveremainingnormalized)} of ${escapeHtml(event.target.dataset.escrowquantitynormalized)}</p>
                    </div>
                </div>

                ${parseFloat(event.target.dataset.givequantitynormalized) !== 1 ? (`
                    <div class="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                        <p class="text-gray-700">
                            Give Quantity is not 1, make sure this is what you want before buying
                        </p>
                    </div>
                `): (``)}
                    <div class="mt-4">
                        <label class="block text-text-secondary text-sm mb-2">Give Quantity</label>
                        <div class="flex space-x-2">
                            <p>${escapeHtml(event.target.dataset.givequantitynormalized)}</p>
                        </div>
                    </div>


                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Dispenser Buy Quantity</label>
                    <div class="flex space-x-2">
                        <input id="userdispensers-buy-quantity" type="number" value="1" 
                                class="input-field w-full px-4 py-3 rounded-lg focus:outline-none">
                    </div>
                </div>

                <div class="m-10"></div>
                <label class="block text-text-secondary text-sm mb-2">Fee: <span id="userdispensers-selected-fee-rate">3</span> (sats/vb) </label> 
                <div class="flex space-x-2">
                    <div class="relative w-full">
                        <label for="userdispensers-sats-per-vb-slider" class="sr-only">Labels range</label>
                        <input id="userdispensers-sats-per-vb-slider" type="range" value="3" min="1" max="200" step="0.1" class="sats-per-vb-slider w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                        <span class="text-sm text-gray-500 dark:text-gray-400 absolute start-0 -bottom-6">1 sat/vb</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400 absolute end-0 -bottom-6">200 sat/vb</span>
                    </div>
                </div>
            </div>    
        `,"Dispense - " + escapeHtml(event.target.dataset.asset),"Buy", buyDispenser);
    }
});
