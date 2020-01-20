

// Fast forward 1 week
let fastForward = async function(time) {
    let oldTime = (await web3.eth.getBlock("latest")).timestamp;

    // fast forward
    try {
        await sendRPC({jsonrpc: "2.0", method: "evm_increaseTime", params: [time], id: 0});
        await sendRPC({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0});
    } catch (err) {
        assert.fail("failed to increase the evm time");
    }

    let newTime = (await web3.eth.getBlock("latest")).timestamp;
    assert.isAtLeast(newTime - oldTime, time, `Did not fast forward at least ${time} seconds`);
}

let sendRPC = async function(payload) {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send(payload, (err, result) => {
            if (err) reject(err)
            else resolve(result)
        })
    })
}

module.exports = {
    fastForward
};
