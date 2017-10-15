const moment = require('moment');
const ELTCoin = artifacts.require('./ELTCoin.sol');
const ELTCoinCrowdsale = artifacts.require("./ELTCoinCrowdsale.sol");

const ether = n => {
  new web3.BigNumber(web3.toWei(n, 'ether'));
};

module.exports = (deployer, network, accounts) => {
  const endTime = new web3.BigNumber(moment.utc('2017-10-15 23:59').format('X'));
  const rate = new web3.BigNumber(2500000);
  const cap = new web3.BigNumber(web3.toWei(525, 'ether'));
  const minThreshold = new web3.BigNumber(web3.toWei(0.1, 'ether'));
  const maxThreshold = new web3.BigNumber(web3.toWei(100, 'ether'));
  const wallet = accounts[0];

  return deployer.deploy(
    ELTCoinCrowdsale, ELTCoin.address, endTime, rate, cap, minThreshold, maxThreshold, wallet
  );
};
