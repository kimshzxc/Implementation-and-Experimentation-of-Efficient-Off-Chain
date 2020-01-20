let eocContract = artifacts.require("eocContract");
let assert = require('chai').assert;
let keccak256 = require('keccak256');
let { fastForward} = require('./plasmamvp_helpers.js');

const promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) { reject(err) }
      resolve(res);
    })
  );


const getBalance = (account, at) =>
    promisify(cb => web3.eth.getBalance(account, at, cb));




contract('Commit', async (accounts) => {

    let authority = accounts[0];
    let A_value = 10;
    let secret = 'test';
    let tproof = 'test';
    let payer;
    let payee;
    let commitNonce;
    let proof;
    let oneWeek = 604800;

    
    console.log("authority = ",authority);


    before(async () => {
        //instance = await eocContract.new({from: authority});
        instance = await eocContract.deployed();
    });


    payer = accounts[1];
    payee = accounts[2];




    it("Commit Test", async() => {
        proof = secret;
        for(let i = 0; i< A_value; i++){
            proof = web3.utils.keccak256(proof);
            console.log(i,"번째 proof = ", proof);
        }

        // console.log("proof = ", proof, "proof type = ", typeof(proof));
        let tx = await instance.commit(payer, payee, proof, {from: payer, value: 10});
        console.log("Gas [commit] = ",tx.receipt.gasUsed);
        payer = tx.logs[0].args.payer;
        payee = tx.logs[0].args.payee;
        commitNonce = tx.logs[0].args.commitNonce.toNumber();
        // console.log("tx.logs[0].args = ", tx.logs[0].args);
        // console.log("payer = ", payer);
        // console.log("payee = ", payee);
        // console.log("preimage = ", tx.logs[0].args.preimage);
        // console.log("value = ", tx.logs[0].args.value.toNumber());
        // console.log("commitNonce = ", commitNonce);
        
    });



    it("getcommitNonce", async() =>{
        let tx = await instance.getcommitNonce();
        // console.log("tx = ", tx.toNumber());
    });

    it("getcommit", async() =>{
        let tx = await instance.getcommit(commitNonce-1);
        // console.log("tx = ", tx);
    });

    it("getcalc_proof", async() =>{
        let received = 5;
        tproof = secret;
        for(let i = 0; i< A_value - received; i++){
            tproof = web3.utils.keccak256(tproof);
            console.log("tproof = ",tproof);
        }
        let tx = await instance.getcalc_proof(5, tproof);
        // console.log("getcalc_proof tx = ", tx);
    });

    it("Exit Test1 (payee exit first with 5/10)", async() => {
        
        let received = 5;
        let vproof;


        // pay하는 부분, secret에 전체 자산 - 보낼 자산만큼 해시하여 해시값 전송
        tproof = secret;
        for(let i = 0; i< A_value - received; i++){
            tproof = web3.utils.keccak256(tproof);
            console.log("tproof = ",tproof);
        }
        
        // 테스트 하기 위해 검증하는 부분
        vproof = tproof;
        for(let i = 0; i< received; i++){
            vproof = web3.utils.keccak256(vproof);
            console.log("vproof = ", vproof);
        }

        // console.log("verify test proof = ", proof);
        // console.log("22 tproof = ",tproof);
        // console.log("commitNonce =", commitNonce);
        // console.log("payee =", payee);

        let tx = await instance.startPayeeExit(commitNonce-1, received, tproof, {from: payee});
        console.log("Gas [startPayeeExit] = ",tx.receipt.gasUsed);
        // console.log("tx=", tx);
    });



    it("Exit Test 2-1 (payer request Exit First)", async() => {
        let tx = await instance.startPayerExit(commitNonce-1, 5, {from: payer});
        console.log("Gas [startPayerExit] = ",tx.receipt.gasUsed);
        console.log("tx.logs[0].args = ", tx.logs[0].args);
        console.log("payer = ", tx.logs[0].args.payer);
        console.log("payer = ", tx.logs[0].args.payee);
        console.log("requestTime = ", tx.logs[0].args.requestTime.toNumber());
    });

    
    // it("Exit Test 2-2 (Payer request Invalid Exit Finalize)", async() => {
    //     let tx = await instance.finalize(commitNonce-1, {from: payer});
    //     console.log("tx = ",tx);
    // });



    // Valid Exit Finalize Test
    it("Exit Test 2-4 (Valid Exit Finalize Test)", async() => {
        await fastForward(oneWeek + 100);
        let tx = await instance.finalize(commitNonce-1,{from: payer});
        console.log("Gas [finalize] = ",tx.receipt.gasUsed);
        // console.log("tx = ",tx);
    });
    
    // it("Gas Check(Exit Test 2-4 (Valid Exit Finalize Test))", async() =>{
    //     t_balance_0 = await getBalance(accounts[0]);
    //     t_balance_1 = await getBalance(accounts[1]);
    //     t_balance_2 = await getBalance(accounts[2]);
    //     console.log("balance_0 Diff = ", (balance_0 - t_balance_0));
    //     console.log("balance_1 Diff = ", (balance_1 - t_balance_1));
    //     console.log("balance_2 Diff = ", (balance_2 - t_balance_2));
    //     balance_0 = t_balance_0
    //     balance_1 = t_balance_1
    //     balance_2 = t_balance_2
    // });


    // Challenge Test
    // it("Exit Test 3-1 (payer request Invalid Exit First)", async() => {
    //     let tx = await instance.startPayerExit(commitNonce-1, 6, {from: payer});
    //     console.log("Gas [startPayerExit] = ",tx.receipt.gasUsed);
    //     //console.log("tx.logs[0].args = ", tx.logs[0].args);
    //     //console.log("payer = ", tx.logs[0].args.payer);
    //     //console.log("payer = ", tx.logs[0].args.payee);
    //     //console.log("requestTime = ", tx.logs[0].args.requestTime.toNumber());
    // });
    

    // it("Get Challenge Proof", async() => {
    //     let received = 5;
    //     tproof = secret;

    //     for(let i = 0; i< A_value - received; i++){
    //         tproof = web3.utils.keccak256(tproof);
    //         console.log("tproof = ",tproof);
    //     }
    //     // 테스트 하기 위해 검증하는 부분
    //     vproof = tproof;
    //     for(let i = 0; i< received; i++){
    //         vproof = web3.utils.keccak256(vproof);
    //         //console.log("vproof = ", vproof);
    //     }

    //     //console.log("verify test proof = ", proof);
    //     //console.log("22 tproof = ",tproof);
    // });   

    // it("Exit Test 3-2 (Payee Challenge proof)", async() => {
    //     //console.log("tproof = ", tproof);
    //     let tx = await instance.challengeExit(commitNonce-1, 5, tproof, {from: payee});
    //     console.log("Gas [challengeExit] = ",tx.receipt.gasUsed);
    //     //console.log("tx = ",tx);
    // });

    // Challenge Test End
});