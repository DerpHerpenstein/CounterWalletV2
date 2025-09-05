import "./bitcoinjs-lib.min.js"
import "./secp256k1.min.js"
import Buffer from "./buffer.min.js"

const ecc = window.secp256k1;
bitcoin.initEccLib(ecc);

window.rawHexToPsbt = (rawHex, userAddress, utxoValues, previousTxHex) => {
  try {
    // Parse raw hex transaction
    //console.log(bitcoin.default);
    const tx = bitcoin.Transaction.fromHex(rawHex);
    const psbt = new bitcoin.Psbt();

    // Add inputs to PSBT
    tx.ins.forEach((input, index) => {
      const inputData = {
        hash: Buffer.from(input.hash).reverse().toString('hex'), // Reverse for correct endianness
        index: input.index,
        sequence: input.sequence,
      };

      // Check script type
      console.log(bitcoin.payments);
      const prevOutScript = bitcoin.address.toOutputScript(userAddress);

      const isSegWit = userAddress.includes("bc1q");
      const isTaproot = userAddress.includes("bc1p");
      

      if (isSegWit || isTaproot) {
        // SegWit or Taproot: Add witness UTXO (requires amount and scriptPubKey)
        inputData.witnessUtxo = {
          script: prevOutScript, // Replace with actual scriptPubKey from UTXO
          value: utxoValues[index],
        };
        if (input.witness && input.witness.length > 0) {
          inputData.witness = input.witness;
        }
      } else {
        // Legacy: Add non-witness UTXO (full previous transaction)
        inputData.nonWitnessUtxo = Buffer.from(previousTxHex[index],'hex'); // Replace with actual previous tx hex
      }

      psbt.addInput(inputData);
    });

    // Add outputs to PSBT
    tx.outs.forEach((output) => {
      psbt.addOutput({
        script: output.script,
        value: output.value,
      });
    });

    // Serialize PSBT to base64
    return psbt.toHex();
  } catch (error) {
    return `Error: ${error.message}`;
  }
}