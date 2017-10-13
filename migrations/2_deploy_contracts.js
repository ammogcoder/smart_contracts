var ELTCoin = artifacts.require("./ELTCoin.sol");

module.exports = function(deployer) {
  deployer.deploy(ELTCoin);
};
