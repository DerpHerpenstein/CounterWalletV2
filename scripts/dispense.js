import CounterpartyV2 from "../api/CounterpartyV2.js";

let page = 1;
let dispenseDispenserData = [];

async function buyDispenser() {
    try {
        let quantity = parseFloat(document.getElementById('dispense-buy-quantity').value);
        let satoshirate = parseInt(document.getElementById('dispense-satoshirate').innerText);
        let finalValue = Math.ceil(quantity * satoshirate);
        console.log(quantity, satoshirate, finalValue);

        let source = document.getElementById('dispense-buy-source').innerText;
        let result = await CounterpartyV2.dispenserBuySatsPerVByte(
            walletProvider.walletAddress, // source address
            source, // dispenser address
            finalValue, // quantity
            window.getFeeSelectorValue('dispense'), // fee sats/vb
        );

        // Transaction submission modal
        let txData = result.result;
        window.prepareSignAndBroadcastPSBT(txData);
    } catch (e) {
        window.generalModal.openError("Error composing transaction", e);
    }
}

function openDispenseBuyModal(dispenser) {
    window.generalModal.open(`
            <div class="mb-6">
                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Dispenser Source</label>
                    <div class="flex space-x-2">
                        <p id="dispense-buy-source">${window.escapeHtml(dispenser.source)}</p>
                    </div>
                </div>

                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Price</label>
                    <div class="flex space-x-2">
                        <p>${window.escapeHtml(dispenser.satoshirate_normalized)}</p>
                        <p id="dispense-satoshirate" hidden>${window.escapeHtml(dispenser.satoshirate)}</p>
                    </div>
                </div>

                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Give Remaining</label>
                    <div class="flex space-x-2">
                        <p>${window.escapeHtml(dispenser.give_remaining_normalized)} of ${window.escapeHtml(dispenser.escrow_quantity_normalized)}</p>
                    </div>
                </div>

                ${parseFloat(dispenser.give_quantity_normalized) !== 1 ? (`
                    <div class="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                        <p class="text-gray-700">
                            Give Quantity is not 1, make sure this is what you want before buying
                        </p>
                    </div>
                `) : (``)}
                    <div class="mt-4">
                        <label class="block text-text-secondary text-sm mb-2">Give Quantity</label>
                        <div class="flex space-x-2">
                            <p>${window.escapeHtml(dispenser.give_quantity_normalized)}</p>
                        </div>
                    </div>


                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Dispenser Buy Quantity</label>
                    <div class="flex space-x-2">
                        <input id="dispense-buy-quantity" type="number" value="1"
                                class="input-field w-full px-4 py-3 rounded-lg focus:outline-none">
                    </div>
                </div>

                <div class="m-10"></div>
                ${window.generateFeeSelectorHtml('dispense')}
            </div>
        `, "Dispense - " + window.escapeHtml(dispenser.asset), "Buy", buyDispenser);
}

window.openDispenseBuyModal = openDispenseBuyModal;

document.getElementById('main').addEventListener('click', async function(event) {

    const updateDispensers = () => {
        document.getElementById('dispense-dispenser-data').innerHTML = "";
        for(let i=0; i< dispenseDispenserData.length; i++){
            let propertyHtml = window.generatePropertyDisplayHtml("dispense-"+dispenseDispenserData[i].tx_hash, dispenseDispenserData[i], ["give_quantity_normalized","give_remaining_normalized","satoshirate_normalized","escrow_quantity_normalized"]);
            document.getElementById('dispense-dispenser-data').innerHTML += 
                `<div class="dispense-card glass-card rounded-xl overflow-hidden border border-border-color relative">
                    <div class="p-2">
                        <h4>Asset: ${window.escapeHtml(dispenseDispenserData[i].asset)}</h4>
                        ${propertyHtml}
                        <button data-asset="${window.escapeHtml(dispenseDispenserData[i].asset)}"
                                data-source="${window.escapeHtml(dispenseDispenserData[i].source)}"
                                data-givequantitynormalized="${window.escapeHtml(dispenseDispenserData[i].give_quantity_normalized)}"
                                data-escrowquantitynormalized="${window.escapeHtml(dispenseDispenserData[i].escrow_quantity_normalized)}"
                                data-giveremainingnormalized="${window.escapeHtml(dispenseDispenserData[i].give_remaining_normalized)}"
                                data-satoshiratenormalized="${window.escapeHtml(dispenseDispenserData[i].satoshirate_normalized)}"
                                data-satoshirate="${window.escapeHtml(dispenseDispenserData[i].satoshirate)}"
                            class="dispense-buy-btn btn-primary px-6 py-3 rounded-lg flex items-center justify-center">
                            Buy
                        </button>
                    </div>
                </div>`
                
        }
    }

    //load more dispensers
    if (event.target.id === 'dispense-load-dispensers-btn') {
        try{
            let identifier = document.getElementById('dispense-search-identifier').value;
            let response = await CounterpartyV2.getDispensers(identifier,page,50);
            dispenseDispenserData = response.result;
            updateDispensers();
        }
        catch(e){
            generalModal.openError("Error getting dispensers", e);
        }
    }

    // if the user clicks a dispense buy-btn, we need to open the dispense-buy modal
    else if(event.target.classList.contains('dispense-buy-btn')){
        window.generalModal.open(`
            <div class="mb-6">
                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Dispenser Source</label>
                    <div class="flex space-x-2">
                        <p id="dispense-buy-source">${escapeHtml(event.target.dataset.source)}</p>
                    </div>
                </div>

                <div class="mt-4">
                    <label class="block text-text-secondary text-sm mb-2">Price</label>
                    <div class="flex space-x-2">
                        <p>${escapeHtml(event.target.dataset.satoshiratenormalized)}</p>
                        <p id="dispense-satoshirate" hidden>${escapeHtml(event.target.dataset.satoshirate)}</p>
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
                        <input id="dispense-buy-quantity" type="number" value="1" 
                                class="input-field w-full px-4 py-3 rounded-lg focus:outline-none">
                    </div>
                </div>

                <div class="m-10"></div>
                ${window.generateFeeSelectorHtml('dispense')}
            </div>
        `,"Dispense - " + escapeHtml(event.target.dataset.asset),"Buy", buyDispenser);
    }
});