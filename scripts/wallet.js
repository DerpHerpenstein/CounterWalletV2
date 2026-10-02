import CounterpartyV2 from "../api/CounterpartyV2.js";
import UniSatConnect from "../wallets/UniSatConnect.js";
import OkxConnect from "../wallets/OkxConnect.js";
import LeatherConnect from "../wallets/LeatherConnect.js";
import ManualConnect from "../wallets/ManualConnect.js"
import XcpWalletConnect from "../wallets/XcpWalletConnect.js"
import "./bitcoinjs-lib.min.js"
import Buffer from "./buffer.min.js"

    // Wallet modal functionality
    const walletBtn = document.getElementById('wallet-connect-btn');
    const closeWalletModal = document.getElementById('close-wallet-modal');
    const walletModal = document.getElementById('wallet-modal');

    //const connectUniSatButton = document.getElementById('wallet-unisat');
    //console.log(connectUniSatButton);
    window.walletProvider = null;

    window.prepareSignAndBroadcastPSBT = async (counterpartyTxData) => {
        let txData = JSON.parse(JSON.stringify(counterpartyTxData)); // create a new object
        console.log("Recent Transaction Data", txData);

        // Broadcast a raw transaction hex to mempool.space. Used for the client-signed reveal.
        async function broadcastRawTx(rawHex, noModal){
            try{
                var url = "https://mempool.space/api/tx";
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'text/plain'
                    },
                    body: rawHex
                });
                
                const responseText = await response.text();
                if(response.ok === false){
                    throw new Error(responseText); // if we get not ok this is the error
                }
                else{
                    return responseText; // if we get ok this will be the tx hash
                }
            } catch (err) {
                // if we want a modal
                if(!noModal){
                    generalModal.openError("Error Submitting taproot tx!", err);
                }
                throw new Error("Error Submitting taproot tx: " + err);
            }
          
          }

        // Convert a compressed (33-byte) or x-only (32-byte) pubkey hex to x-only hex.
        function toXOnly(pubkeyHex){
            if(!pubkeyHex) return null;
            const hex = pubkeyHex.startsWith("0x") ? pubkeyHex.slice(2) : pubkeyHex;
            if(hex.length === 66) return hex.slice(2); // drop the compressed prefix byte
            if(hex.length === 64) return hex;
            return null;
        }

        // Build a BIP-342 PSBT for the unsigned reveal so the wallet can sign the leaf.
        // Supports reveals that spend one or more commit outputs.
        function buildRevealPsbt(tmpData){
            const tx = bitcoin.Transaction.fromHex(tmpData.reveal_rawtransaction);
            const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

            const envelopeScript = Buffer.from(tmpData.envelope_script, "hex");
            const controlBlock = Buffer.from(tmpData.reveal_control_block, "hex");

            tx.ins.forEach((input, index) => {
                const value = tmpData.reveal_inputs_values[index];
                const lockScript = Buffer.from(tmpData.reveal_lock_scripts[index], "hex");
                psbt.addInput({
                    hash: Buffer.from(input.hash).reverse().toString("hex"),
                    index: input.index,
                    sequence: input.sequence,
                    witnessUtxo: {
                        script: lockScript,
                        value: value
                    },
                    // BIP-342 leaf data - makes signPSBT produce the correct signature
                    tapLeafScript: [{
                        leafVersion: 0xc0,
                        script: envelopeScript,
                        controlBlock: controlBlock
                    }]
                });
            });

            tx.outs.forEach(out => {
                psbt.addOutput({ script: out.script, value: out.value });
            });

            return psbt;
        }

        // Collect the external (non-change) outputs of a raw tx, for wallet intents.
        function collectExternalOutputs(txHex, changeAddress){
            const tx = bitcoin.Transaction.fromHex(txHex);
            const outputs = [];
            for(const out of tx.outs){
                let address = null;
                try{ address = bitcoin.address.fromOutputScript(out.script, bitcoin.networks.bitcoin); }catch(e){}
                if(address === changeAddress) continue; // change - excluded
                if(address) outputs.push({ address, amountSats: out.value });
            }
            return outputs;
        }

        // Sign the reveal with the connected wallet and return the signed tx hex.
        async function signReveal(tmpData){
            const psbt = buildRevealPsbt(tmpData);
            const psbtHex = psbt.toHex();

            if(walletProvider.walletName === "xcpwallet"){
                // The reveal is a plain-BTC tx (the Counterparty data lives in the
                // tapscript), so sign it through the bitcoin-payment capability.
                const outputs = collectExternalOutputs(tmpData.reveal_rawtransaction, walletProvider.walletAddress);
                const signedPsbtHex = await walletProvider.signBitcoinPaymentPSBT(
                    psbtHex,
                    walletProvider.walletAddress,
                    outputs
                );
                const signedPsbt = bitcoin.Psbt.fromHex(signedPsbtHex);
                try { signedPsbt.finalizeAllInputs(); } catch(_) {}
                return signedPsbt.extractTransaction().toHex();
            }

            // UniSat / OKX / Leather - tell the wallet which inputs to sign (the
            // source key closes the envelope) and let us finalize locally.
            const toSignInputs = Array.from({ length: psbt.inputCount }, (_, index) => ({
                index,
                address: walletProvider.walletAddress
            }));
            const signedPsbtHex = await walletProvider.signPSBT(psbtHex, {
                autoFinalized: false,
                toSignInputs
            });
            const signedPsbt = bitcoin.Psbt.fromHex(signedPsbtHex);
            try { signedPsbt.finalizeAllInputs(); } catch(_) {}
            return signedPsbt.extractTransaction().toHex();
        }

        // Sign & broadcast the commit tx, then (for taproot) broadcast the reveal.
        // Split out of beginSignAndBroadcast so the taproot flow can pause on the
        // "save your signed reveal" modal before the commit is signed.
        async function signAndBroadcastCommit(tmpData, isTaprootTx, signedRevealHex){
            try{
                if(isTaprootTx){
                    window.showToast(`Signing commit transaction...`, 'Info');
                }
                let result;
                if(walletProvider.walletName === "xcpwallet"){
                    if(isTaprootTx){
                        // The taproot commit tx is a plain BTC payment with no Counterparty data, which
                        // XCP refuses through xcp_signTransaction - sign it with xcp_signBitcoinPsbt instead.
                        let finalPsbt = window.rawHexToPsbt(tmpData.rawtransaction, walletProvider.walletAddress, tmpData.inputs_values, null);
                        // collect the external outputs (everything that is not change back to the signer)
                        let outputs = [];
                        let tx = bitcoin.Transaction.fromHex(tmpData.rawtransaction);
                        for(const out of tx.outs){
                            let address = null;
                            try{ address = bitcoin.address.fromOutputScript(out.script, bitcoin.networks.bitcoin); }catch(e){}
                            if(address === walletProvider.walletAddress) continue; // change - excluded
                            if(address) outputs.push({ address, amountSats: out.value });
                        }
                        let signedPSBT = await walletProvider.signBitcoinPaymentPSBT(finalPsbt, walletProvider.walletAddress, outputs);
                        let signedPsbt = bitcoin.Psbt.fromHex(signedPSBT);
                        signedPsbt.finalizeAllInputs();
                        result = await walletProvider.broadcastTx(signedPsbt.extractTransaction().toHex());
                    }
                    else{
                        // XCP Wallet signs the raw counterparty tx directly (it resolves prevouts itself)
                        let signedResult = await walletProvider.signRawTransaction(tmpData.rawtransaction);
                        result = await walletProvider.broadcastTx(signedResult.hex);
                    }
                }
                else{
                    let finalPsbt;
                    if(walletProvider.walletAddress[0] === "1"){ // if this is a legacy address, we need the previous tx hex's
                        let addressUtxos = await CounterpartyV2.getUtxos(walletProvider.walletAddress);
                        let transactionMap = {};
    
                        // Create array of promises
                        const promises = addressUtxos.result.map(async (utxo) => {
                            const txHash = utxo.txid;
                            const value = utxo.value;
                            
                            try {
                                const transactionData = await CounterpartyV2.getBitcoinTransaction(txHash);
                                //console.log(transactionData);
                                // TODO: NEDED TO ADD CHECK FOR MULTIPLE OF THE SAME UTXO AMOUNTS HERE
                                // Store with value as key
                                transactionMap[value] = {
                                    tx_hash: txHash,
                                    tx_hex: transactionData.result.hex
                                };
                            } catch (error) {
                                console.error(`Failed to fetch transaction ${txHash}:`, error);
                            }
                        });
                        
                        // Wait for all promises to complete
                        await Promise.all(promises);
                        let finalTxHexArray = [];
                        for (const inputValue of tmpData.inputs_values) {
                            finalTxHexArray.push(transactionMap[inputValue].tx_hex);
                        }
                        finalPsbt = window.rawHexToPsbt(tmpData.rawtransaction, walletProvider.walletAddress, tmpData.inputs_values, finalTxHexArray);
                    }// if we are taproot or segwit, just do what is normally done
                    else if(walletProvider.walletAddress.includes("bc1p") || walletProvider.walletAddress.includes("bc1q")){
                        // P2TR sources need the x-only internal key so the wallet can
                        // produce a key-path signature for the commit inputs.
                        const tapInternalKey = walletProvider.walletAddress.includes("bc1p")
                            ? toXOnly(walletProvider.publicKey)
                            : null;
                        finalPsbt = window.rawHexToPsbt(tmpData.rawtransaction, walletProvider.walletAddress, tmpData.inputs_values, null, null, tapInternalKey);
                    }
                    else{
                        throw new Error("Only Legacy, Native Segwit and Taproot addresses supported")
                    }
                    console.log("Corrected PSBT", finalPsbt);
                    result = await walletProvider.signAndBroadcastPSBT(finalPsbt);
                }
                window.showToast(`
                    Transaction successful!<br>
                    <a href="https://mempool.space/tx/${result}" class="text-accent-blue hover:text-accent-purple" target="_blank">View on Mempool.space</a>
                    `, 'success');
                console.log("Signed Tx Hash",result);
                if(isTaprootTx){
                    window.showToast(`Broadcasting taproot reveal tx...`, 'Info');
                    // wait for the commit tx to propagate for a few seconds
                    setTimeout( async () => {
                        try{
                            const taprootResult = await broadcastRawTx(signedRevealHex);
                            window.showToast(`
                                Reveal Transaction successful!<br>
                                <a href="https://mempool.space/tx/${taprootResult}" class="text-accent-blue hover:text-accent-purple" target="_blank">View on Mempool.space</a>
                                `, 'success');
                        }
                        catch(e){
                            console.log("Error broadcasting reveal", e);
                            window.showToast(`
                                Reveal Transaction failed!<br>
                                ${e}<br>
                                Your signed reveal is saved in the downloaded JSON - you can rebroadcast it manually.
                                `, 'error');
                        }
                    },5000);

                }
            }
            catch(e){
                generalModal.openError("Error signing transaction", e);
            }
        }

        // After the reveal is signed, make the user save the file before we sign the
        // commit. The Continue click also restores the user-activation the commit
        // wallet popup needs (the reveal popup consumed it).
        function showRevealDownloadModal(tmpData, signedRevealHex){
            const filename = "counterparty-taproot-tx-" + Date.now() + ".json";
            generalModal.open(`
                <div class="space-y-4">
                    <div class="font-bold text-sm text-amber-500">
                        Your taproot reveal transaction has been signed.
                    </div>
                    <p class="text-text-primary">
                        Download and save the transaction file before continuing. If the reveal broadcast fails,
                        this file lets you rebroadcast the signed reveal manually.
                    </p>
                    <button id="taproot-download-btn" class="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2">
                        <i class="fas fa-download"></i>
                        <span>Download Transaction File</span>
                    </button>
                    <label class="flex items-center space-x-2 text-text-primary cursor-pointer">
                        <input type="checkbox" id="taproot-download-confirm" class="w-4 h-4">
                        <span>I have downloaded and saved the file</span>
                    </label>
                </div>
            `, "Save Your Signed Reveal", "Sign Commit Transaction", async ()=>{
                generalModal.close();
                await signAndBroadcastCommit(tmpData, true, signedRevealHex);
            });

            const downloadBtn = document.getElementById('taproot-download-btn');
            const checkbox = document.getElementById('taproot-download-confirm');
            const confirmBtn = document.getElementById('modal-confirm');

            // gate the Continue button until the user confirms the download
            if(confirmBtn) confirmBtn.disabled = true;
            if(downloadBtn){
                downloadBtn.addEventListener('click', ()=>{
                    window.downloadJSON(tmpData, filename);
                });
            }
            if(checkbox && confirmBtn){
                checkbox.addEventListener('change', ()=>{
                    confirmBtn.disabled = !checkbox.checked;
                });
            }
        }

        async function beginSignAndBroadcast(tmpData, isTaprootTx){
            try{
                console.log("Generated tx info", tmpData);
                // seperate behavior for manual wallet, need to show the data, but wont actually sign anything
                // NOTE: taproot transactions are blocked for manual wallets before this point.
                if(walletProvider.walletName === "manual"){
                    generalModal.open(`
                        <div class="space-y-4">
                            <div class="font-bold text-sm text-amber-500">
                                WARNING: This is a raw hex transaction. Signing it could steal everything in your wallet! Use a decoder and only sign this if you agree with it!
                            </div>
                            <h4 class="font-bold text-lg">Transaction Hex To Sign</h4>
                            <p class="text-text-primary">Use your wallet to manually sign this</p>
                            <div class="w-full h-20 overflow-y-auto bg-card-bg border border-border-color p-2">
                                <p class="text-text-primary">${escapeHtml(tmpData.rawtransaction)}</p>
                            </div>
                        </div>
                    `, "Manually Sign Transaction", "Okay",
                    ()=> {
                        generalModal.close();
                    } );

                }
                else{
                    // For taproot, sign the reveal FIRST. If reveal signing fails we abort
                    // before broadcasting the commit, so no BTC is stranded at the reveal
                    // address. The commit txid is stable regardless of signing, so the
                    // reveal can be signed before the commit is broadcast.
                    if(isTaprootTx){
                        window.showToast(`Signing taproot reveal tx...`, 'Info');
                        const signedRevealHex = await signReveal(tmpData);
                        // attach the signed reveal so the downloaded JSON can be rebroadcast as-is
                        tmpData.signed_reveal_rawtransaction = signedRevealHex;
                        window.showToast(`Reveal transaction signed.`, 'success');
                        // Pause here: the user must save the file before we sign the commit.
                        // The Continue click also restores the user-activation the commit
                        // wallet popup needs (the reveal popup consumed it).
                        showRevealDownloadModal(tmpData, signedRevealHex);
                        return;
                    }

                    await signAndBroadcastCommit(tmpData, isTaprootTx, null);
                }
            }
            catch(e){
                generalModal.openError("Error signing transaction", e);
            }
        }

        function createParamsTable(tmpData){
            let objKeys = Object.keys(tmpData);

            let tableHtml = `
                <h3 class="text-lg font-semibold mb-4">Parameters</h3>
                <div class="glass-card rounded-xl p-6 overflow-y-auto max-h-[35vh]">                
                    <div>
                            `
            for(const key of objKeys){
                
                tableHtml += `
                        <label class="block text-text-secondary text-sm mb-2">${window.escapeHtml(key)}</label>
                        <div class="flex space-x-2">
                            <span>&nbsp;${window.escapeHtml(JSON.stringify(tmpData[key]))}</span>
                        </div>
                `;
            }         
            tableHtml += `
                    </div>
                </div>
                `;
            return tableHtml;
            
        }
        
        const isTaprootTx = !!(txData.reveal_rawtransaction && txData.envelope_script);

        // Taproot transactions require a BIP-342 script-path signature that the
        // manual/offline wallet path cannot easily reproduce, so block them here.
        if(isTaprootTx && walletProvider.walletName === "manual"){
            generalModal.openError(
                "Taproot transactions are not supported with manual wallets",
                new Error("Manual signing is currently disabled for taproot transactions. Please connect a supported wallet (UniSat, OKX, Leather, or XCP Wallet).")
            );
            return;
        }

        generalModal.open(`
            <div class="space-y-4">
                <h4 class="font-bold text-lg">Transaction Type: ${window.escapeHtml(txData.name)}</h4>
                ${isTaprootTx ? `<div class="font-bold text-sm text-amber-500">WARNING: Taproot transaction! This type of transaction requires a reveal tx to be submitted. 
                                                            if it is not submitted, you will lose the bitcoin sent to the reveal address <br><br>
                                                            <span class="text-yellow-300">Save the file before signing your transaction!</span></div>` : "" }
                ${createParamsTable(txData.params)}
            </div>
        `, "Confirm Transaction", "Yes", 
        ()=> {
            generalModal.close(); 
            beginSignAndBroadcast(txData, isTaprootTx);
        } );
        
    }
    
    if (walletBtn) {
        walletBtn.addEventListener('click', function() {
            // if we arent logged in, the wallet modal shouldnt open
            if(walletProvider === null){
                walletModal.classList.add('active');
            }
            else{
                // put the copy info into the button
                document.getElementById('wallet-dropdown-copy-btn').setAttribute('data-copydata', walletProvider.walletAddress);
                document.getElementById('wallet-dropdown').classList.toggle('hidden');
            }
        });
    }
    
    if (closeWalletModal) {
        closeWalletModal.addEventListener('click', function() {
            walletModal.classList.remove('active');
        });
    }
    
    // Close modal when clicking outside
    walletModal.addEventListener('click', async function(e) {

        function showWalletAddress(addr) {
            return `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
        }

        //console.log(e.target)
        if (e.target === walletModal) {
            walletModal.classList.remove('active');
        }
        // connect to unisat wallet
        else if(e.target.id === "wallet-unisat"){
            try{
                walletProvider = new UniSatConnect();
                await walletProvider.connect();
                console.log(walletProvider)
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                setActivePage(currentPage, false);
            }
            catch(e){
                window.generalModal.openError("Error connecting wallet", e);
            }
        }
        // connect okx
        else if(e.target.id === "wallet-okx"){
            try{
                walletProvider = new OkxConnect();
                await walletProvider.connect();
                console.log(walletProvider)
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                setActivePage(currentPage, false);
            }
            catch(e){
                window.generalModal.openError("Error connecting wallet", e);
            }
        }
        else if(e.target.id === "wallet-leather"){
            try{
                walletProvider = new LeatherConnect();
                await walletProvider.connect();
                console.log(walletProvider)
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                setActivePage(currentPage, false);
            }
            catch(e){
                window.generalModal.openError("Error connecting wallet", e);
            }
        }
        // connect xcp wallet
        else if(e.target.id === "wallet-xcp"){
            try{
                walletProvider = new XcpWalletConnect();
                await walletProvider.connect();
                console.log(walletProvider)
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                setActivePage(currentPage, false);
            }
            catch(e){
                window.generalModal.openError("Error connecting wallet", e);
            }
        }
        else if(e.target.id === "wallet-manual"){
            let tmpAddress = document.getElementById('wallet-modal-address-input').value;
            try{
                if(tmpAddress.length == 0){
                    throw new Error("Enter an address to connect")
                }
                bitcoin.address.toOutputScript(tmpAddress, bitcoin.networks.bitcoin);
                walletProvider = new ManualConnect();
                await walletProvider.connect(tmpAddress);
                console.log(walletProvider);
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                setActivePage(currentPage, false);
            }
            catch(e){
                generalModal.openError("Wallet connect error", e);
            }
            
        }
    });
  