let Contract = artifacts.require("eocContract");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(Contract, {from: accounts[0]});
};