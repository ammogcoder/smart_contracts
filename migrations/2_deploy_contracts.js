const ELTCoin = artifacts.require("./ELTCoin.sol");

module.exports = deployer => {
  deployer.deploy(ELTCoin);
};
