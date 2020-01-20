pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./SafeMath.sol";


contract eocContract{

    event commited(address payer, address payee, uint256 value, bytes32 preimage, uint256 commitNonce);
    event returning(string result);
    event payerExitRequested(address payer, address payee, uint256 remain, uint256 requestTime);
    event finalizePayerExit(address payer, address payee, uint256 value);
    event payerExitFailed(address payer, address payee, uint256 value, uint256 remainTime);

    //event request_getcalc_result(bytes32 calc);
    using SafeMath for uint256;

    uint256 public commitNonce = 1;
    mapping(uint256 => commitStruct) public commits;
    mapping(uint256 => payerExitRequest) public payerExitQueue;

    struct commitStruct{
        address payer;
        address payee;
        uint256 amount;
        bytes32 preimage;

    }

    struct payerExitRequest{
        address payable payer;
        address payee;
        uint256 remain;
        uint256 requestTime;
    }


    function commit(address payer, address payee, bytes32 preimage) public payable
    {
        commits[commitNonce] = commitStruct(payer, payee, msg.value, preimage);
        //commitNonce = commitNonce.add(uint256(1));
        commitNonce = commitNonce + 1;
        emit commited(payer, payee, msg.value, preimage, commitNonce);
    }

    // for test
    function getcommit(uint256 nonce) public view returns(commitStruct memory){
        return commits[nonce];
    }

    // for test
    function getcommitNonce() public view returns(uint256){
        return commitNonce;
    }

    constructor() public
    {
        commitNonce = 1;
    }

    // Address to string for test 
    function AddressToString(address x) public returns (string memory)
    {
        bytes memory b = new bytes(20);
        for (uint i = 0; i < 20; i++)
            b[i] = byte(uint8(uint(x) / (2**(8*(19 - i)))));
        return string(b);
    }

    // for test 계산된 proof값 리턴
    function getcalc_proof(uint256 received, bytes32 proof) public view returns(bytes32)
    {
        bytes32 calc_proof;
        calc_proof = proof;
        for (uint i = 0; i < received ; i++) {
            calc_proof = keccak256(abi.encodePacked(calc_proof));
        }
        return calc_proof;
    }

    function startPayeeExit(uint256 nonce, uint256 received, bytes32 proof) public payable
    {
        // address sender = msg.sender;
        require((commits[nonce].payee == msg.sender), "Sender Address Error");
        require(commits[nonce].amount >= received,"Amount value Error");
        require(received > 0,"Amount value Error2");
        //require(depositExits[nonce].state == ExitState.NonExistent);
        bytes32 calc_proof;
        calc_proof = proof;
        for (uint i = 0; i < received ; i++) {
            calc_proof = keccak256(abi.encodePacked(calc_proof));
        }

        // verify preimage with commited preimage
        require(calc_proof == commits[nonce].preimage, "Preimage verfy error");
        if(received == commits[nonce].amount){
            
            emit returning("full exit ok?");
            //delete commits[nonce]
            commits[nonce].amount = 0;
            msg.sender.transfer(received);
        }
        else{
            commits[nonce].preimage = proof;
            commits[nonce].amount = received;
            emit returning("part exit ok?");
            msg.sender.transfer(received);
        }
    }


    function startPayerExit(uint256 nonce, uint256 remain) public {
        // 요청 검증
        require((commits[nonce].payer == msg.sender), "Sender Address Error");
        require(commits[nonce].amount >= remain,"remain value Error");
        require(remain > 0,"remain value Error2");

        // 검증 통과시, Queue에 들어가는 부분
        payerExitQueue[nonce] = payerExitRequest(msg.sender, commits[nonce].payee, remain, block.timestamp);

        // Payer Exit Queue에 해당 nonce값이 추가되었다는 이벤트 발생시킴.
        emit payerExitRequested(msg.sender, commits[nonce].payee, remain, block.timestamp);
    }


    function getPayerExitQueue(uint256 nonce) public view returns(payerExitRequest memory){
        return payerExitQueue[nonce];
    }

    // 1주일 이후 재요청시 Exit 진행시킴
    function finalize(uint256 nonce) public payable{
        address payable t_payer = payerExitQueue[nonce].payer;
        address t_payee = payerExitQueue[nonce].payee;
        uint256 t_remain = payerExitQueue[nonce].remain;
        uint256 t_balance = commits[nonce].amount;

        uint256 pastTime = block.timestamp - payerExitQueue[nonce].requestTime;
        uint256 challengePeriod = 1 weeks;

        require(t_payer == msg.sender,"Payer Address is Invalid");
        require(t_balance - t_remain >= 0, "Balance is not enough to finalize");


        if(pastTime >= challengePeriod){
            t_payer.transfer(t_remain);
            emit finalizePayerExit(t_payer, t_payee, t_remain);
        }

        else{
            uint256 remainTime = challengePeriod - pastTime;
            emit payerExitFailed(t_payer, t_payee, t_remain, remainTime);
        }
    }



    // Queue에 있는 Exit 요청에 Challenge를 제시할 수 있음
    function challengeExit(uint nonce, uint256 received, bytes32 proof) public payable {
        
        //uint256 t_remain = payerExitQueue[nonce].remain;
        uint256 t_deposit = commits[nonce].amount;
        bytes32 calc_proof;

        // Challenger & Value Validation
        require(msg.sender == payerExitQueue[nonce].payee,"Challenger Address Error");
        require(t_deposit >= received, "Invalid Challenge Error");

        // Challenge proof Validation
        calc_proof = proof;
        for (uint i = 0; i < received ; i++) {
            calc_proof = keccak256(abi.encodePacked(calc_proof));
        }


        require(calc_proof == commits[nonce].preimage, "Preimage verfy error");
        
        if(received == t_deposit){
            emit returning("full exit ok?");
            commits[nonce].amount = 0;
            msg.sender.transfer(received);
            // deleteCommit(commits[nonce]);
        }

        else{
            commits[nonce].preimage = proof;
            commits[nonce].amount = received;
            emit returning("part exit ok?");
            msg.sender.transfer(received);
        }

    }


}



