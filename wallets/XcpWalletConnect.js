
/**
 * A class to make btc easier to deal with
 */
class XcpWalletConnect {
 
    constructor() {
      this.connected = null;
      this.walletAddress = null;
      this.publicKey = null;
      this.walletName = null;
    }

    /**
     * Returns the tx hash or throws an error in case of failure
     * @param rawTxHex
     * @returns {Promise<*>}
     */
    async broadcastTx(rawTxHex){
        try {
            let res = await window.xcpwallet.request({ method: 'xcp_broadcastTransaction', params: [rawTxHex] });
            return res.txid;

        } 
        catch (error) {
            console.log("Broadcast failed", error);
            // re-throw the error so it can be handled by the caller
            throw error;
        }
    }

    /**
     * Sign a raw counterparty transaction. XCP Wallet resolves prevouts and
     * shows its own approval screen. Returns { hex: '<signed transaction hex>' }
     * @param rawTxHex
     * @returns {Promise<*>}
     */
    async signRawTransaction(rawTxHex){
        try {
            let res = await window.xcpwallet.request({ method: 'xcp_signTransaction', params: [{ hex: rawTxHex }] });
            return res;

        } 
        catch (error) {
            console.log("Sign failed", error);
            // re-throw the error so it can be handled by the caller
            throw error;
        }
    }


    /**
     * Sign a fully funded plain-Bitcoin PSBT (no Counterparty payload). XCP Wallet
     * refuses non-Counterparty transactions through xcp_signTransaction/xcp_signPsbt,
     * so taproot reveal commit txs use this xcp_signBitcoinPsbt capability instead.
     * Returns the signed PSBT hex.
     * @param rawPSBT
     * @param walletAddress - the address that owns the inputs
     * @param outputs - [{ address, amountSats }] external outputs (change excluded)
     * @returns {Promise<*>}
     */
    async signBitcoinPaymentPSBT(rawPSBT, walletAddress, outputs){
        try {
            const psbt = bitcoin.Psbt.fromHex(rawPSBT);
            const inputIndices = Array.from({ length: psbt.inputCount }, (_, i) => i);
            let res = await window.xcpwallet.request({
                method: 'xcp_signBitcoinPsbt',
                params: [{
                    hex: rawPSBT,
                    signInputs: { [walletAddress]: inputIndices },
                    sighashTypes: inputIndices.map(() => 0x01),
                    intent: {
                        standard: 'xcp-wallet/bitcoin-payment',
                        version: 1,
                        action: 'pay',
                        outputs,
                        description: 'Counterparty taproot reveal funding'
                    }
                }]
            });
            return res.hex;

        }
        catch (error) {
            console.log("Sign failed", error);
            // re-throw the error so it can be handled by the caller
            throw error;
        }
    }

    /**
     * Sign multiple PSBTs in one approval via the provider's bundle method.
     * Used for the taproot commit-and-reveal pair. Returns the signed PSBT hexes
     * in the same order as the requests.
     * @param requests - [{ hex, signInputs, sighashTypes, intent? }]
     * @returns {Promise<string[]>}
     */
    async signPsbts(requests){
        const res = await window.xcpwallet.request({ method: 'xcp_signPsbts', params: [{ requests }] });
        return res.hexes;
    }

    /**
     * Fetch the active account info (address + public key) using the official
     * xcp_getAddresses method. Needed so the node can build the taproot reveal
     * envelope (multisig_pubkey). Returns null if unavailable.
     * @returns {Promise<{address: string, publicKey: string}|null>}
     */
    async getAddresses(){
        try {
            const info = await window.xcpwallet.request({ method: 'xcp_getAddresses' });
            const active = info?.active;
            if (!active) {
                return null;
            }
            return {
                address: active.address || null,
                publicKey: active.publicKey || null
            };
        }
        catch (error) {
            console.log("Could not fetch XCP Wallet addresses", error);
            return null;
        }
    }

    static isXcpWalletInstalled = () => {
        if (typeof window !== 'undefined') {
            return typeof window.xcpwallet !== 'undefined';
        } else {
            return false;
        }
    }

    async connect() {
        this.connected = false;
        // check if XCP Wallet is installed
        if (XcpWalletConnect.isXcpWalletInstalled()) {
            try {
                let result = await window.xcpwallet.request({ method: 'xcp_requestAccounts' });
                this.walletAddress = result.accounts[0];
                // Official way to get the active address + public key once the
                // wallet is connected and unlocked.
                const info = await this.getAddresses();
                if (info) {
                    if (info.address) {
                        this.walletAddress = info.address;
                    }
                    this.publicKey = info.publicKey;
                }
                this.walletName = "xcpwallet";
                this.connected = true;
                console.log("Connected with XCP Wallet: ", this.walletAddress);
              } catch (error) {
                // re-throw the error so it can be handled by the caller
                throw error;
              }
        } else {
            throw new Error('XCP Wallet is not installed');
        }
    }
    
}

export default XcpWalletConnect;
