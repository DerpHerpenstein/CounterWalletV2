
/**
 * A class to make btc easier to deal with
 */
class ManualConnect {
 
    constructor() {
      this.connected = null;
      this.connectType = null;
      this.walletAddress = null;
      this.publicKey = null;
    }

    /**
     * Returns the tx hash or throws an error in case of failure
     * @param rawPSBTHex
     * @returns {Promise<*>}
     */
    async broadcastPSBT(signedPSBT){
        throw new Error("broadcastPSBT Not implimented");
    }


    // signs and broadcasts a PSBT
    signPSBT = async(rawPSBT) => {
        throw new Error("signPSBT Not implimented");
    }

    signAndBroadcastPSBT = async (signedPSBT) => { 
        throw new Error("signAndBroadcastPSBT Not implimented");
    }


    async connect() {
        this.connected = false;
        this.walletAddress = "";
        this.publicKey = ""
        this.connected = true;
        console.log("Connected with Manual Wallet: ", this.walletAddress);
    }
}

export default LeatherConnect;