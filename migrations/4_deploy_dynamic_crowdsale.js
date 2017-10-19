var ELTCoin = artifacts.require('./ELTCoin.sol');
var ELTCoinCrowdsale = artifacts.require('./ELTCoinCrowdsale.sol');

const ether = n => {
  new web3.BigNumber(web3.toWei(n, 'ether'));
};

module.exports = (deployer, network, accounts) => {
  const endTime = new web3.BigNumber(1509212871);
  const startRate = new web3.BigNumber(320000);
  const cap = new web3.BigNumber(web3.toWei(1000, 'ether'));
  const minThreshold = new web3.BigNumber(web3.toWei(0.1, 'ether'));
  const capPerAddress = new web3.BigNumber(web3.toWei(100, 'ether'));
  const wallet = accounts[0];

  return deployer.deploy(
    ELTCoinCrowdsale,
    ELTCoin.address,
    endTime,
    startRate,
    cap,
    minThreshold,
    capPerAddress,
    wallet,
  );
};
