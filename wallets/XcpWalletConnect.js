
/**
 * A class to make btc easier to deal with
 */
class XcpWalletConnect {
 
    constructor() {
      this.connected = null;
      this.connectType = null;
      this.walletAddress = null;
      this.publicKey = null;
      this.walletName = null;
    }

    /**
     * Returns the tx hash or throws an error in case of failure
     * @param signedPSBT
     * @returns {Promise<*>}
     */
    async broadcastPSBT(signedPSBT){
        return this.broadcastTx(signedPSBT);
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


    signPSBT = async(rawPSBT) => {
        let res = await window.xcpwallet.request({ method: 'xcp_signPsbt', params: [{ hex: rawPSBT }] }); 
        return res.hex;
    }


    signAndBroadcastPSBT = async (psbt) => { 
            try {
                let signedPSBT = await this.signPSBT(psbt);
                let finalPsbt = bitcoin.Psbt.fromHex(signedPSBT);
                finalPsbt.finalizeAllInputs();
                let result = await this.broadcastTx(finalPsbt.extractTransaction().toHex());
                return(result)


            } catch (error) {
                throw new Error(`Error signing PSBT: ${error.message}`);
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
