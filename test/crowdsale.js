const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const {
  ether,
  latestTime,
  advanceBlock,
  duration,
  increaseTimeTo,
} = require('./helpers');
const ELTCoinCrowdsale = artifacts.require('./ELTCoinCrowdsale.sol');
const ELTCoin = artifacts.require('./ELTCoin.sol');

contract('ELTCoinCrowdsale', accounts => {
  const owner = accounts[0];
  const wallet = accounts[0];
  const investor = accounts[1];

  const RATE = new BigNumber(2500000);
  const CAP = ether(525);
  const MINIMUM_THRESHOLD = ether(0.1);
  const CAP_PER_ADDRESS = ether(2);

  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async () => {
    this.endTime = latestTime() + duration.weeks(1);
    this.afterEndTime = this.endTime + duration.minutes(1);
    this.token = await ELTCoin.new();
    this.crowdsale = await ELTCoinCrowdsale.new(
      this.token.address,
      this.endTime,
      RATE,
      CAP,
      MINIMUM_THRESHOLD,
      CAP_PER_ADDRESS,
      wallet,
    );

    await this.token.transfer(this.crowdsale.address, CAP.div(RATE), {
      from: owner,
    });
  });

  it('should create crowdsale with correct parameters', async () => {
    this.crowdsale.should.exist;
    this.token.should.exist;

    (await this.crowdsale.endTime()).should.be.bignumber.equal(this.endTime);
    (await this.crowdsale.rate()).should.be.bignumber.equal(RATE);
    (await this.crowdsale.wallet()).should.be.equal(wallet);
    (await this.crowdsale.cap()).should.be.bignumber.equal(CAP);
    (await this.crowdsale.minThreshold()).should.be.bignumber.equal(
      MINIMUM_THRESHOLD,
    );
    (await this.crowdsale.capPerAddress()).should.be.bignumber.equal(
      CAP_PER_ADDRESS,
    );
  });

  it('should reject payments from a non whitelisted member', async () => {
    await this.crowdsale
      .buyTokens(investor, { value: ether(0.2), from: investor })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should accept payments from a whitelisted member', async () => {
    await this.crowdsale.changeRegistrationStatus(investor, true, {
      from: owner,
    });

    const investmentAmount = ether(0.2);
    const expectedTokenAmount = investmentAmount.div(RATE);

    web3.eth.sendTransaction({
      from: investor,
      to: this.crowdsale.address,
      value: investmentAmount,
      gas: 1000000,
      gasPrice: 40000000000,
    });

    const totalSupply = CAP.div(RATE);

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(
      expectedTokenAmount,
    );
    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(totalSupply.sub(expectedTokenAmount));
  });

  it('should reject payments from a whitelisted member with gas amount above threshold', async () => {
    await this.crowdsale.changeRegistrationStatus(investor, true, {
      from: owner,
    });
    await this.crowdsale
      .buyTokens(investor, {
        value: ether(0.2),
        from: investor,
        gasPrice: 50000000001,
      })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should reject payments below minimum threshold', async () => {
    await this.crowdsale.changeRegistrationStatus(investor, true, {
      from: owner,
    });
    await this.crowdsale
      .buyTokens(investor, {
        value: ether(0.01),
        from: investor,
        gasPrice: 40000000000,
      })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should accept payments below maximum cap', async () => {
    await this.crowdsale.changeRegistrationStatus(investor, true, {
      from: owner,
    });
    await this.crowdsale.buyTokens(investor, {
      value: ether(0.5),
      from: investor,
      gasPrice: 40000000000,
    }).should.be.fulfilled;
    await this.crowdsale.buyTokens(investor, {
      value: ether(0.5),
      from: investor,
      gasPrice: 40000000000,
    }).should.be.fulfilled;
    await this.crowdsale.buyTokens(investor, {
      value: ether(0.5),
      from: investor,
      gasPrice: 40000000000,
    }).should.be.fulfilled;
    await this.crowdsale.buyTokens(investor, {
      value: ether(0.5),
      from: investor,
      gasPrice: 40000000000,
    }).should.be.fulfilled;
  });

  it('should reject payments above maximum cap', async () => {
    await this.crowdsale.changeRegistrationStatus(investor, true, {
      from: owner,
    });
    await this.crowdsale.buyTokens(investor, {
      value: ether(1),
      from: investor,
      gasPrice: 40000000000,
    }).should.be.fulfilled;
    await this.crowdsale
      .buyTokens(investor, {
        value: ether(1.1),
        from: investor,
        gasPrice: 40000000000,
      })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should reject payments after end', async () => {
    await this.crowdsale.changeRegistrationStatus(investor, true, {
      from: owner,
    });
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale
      .send(ether(0.1))
      .should.be.rejectedWith('invalid opcode');
    await this.crowdsale
      .buyTokens(investor, {
        value: ether(1),
        from: investor,
        gasPrice: 40000000000,
      })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should not allow tokens withdrawal before end', async () => {
    await this.crowdsale
      .drainRemainingToken({ from: owner })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should allow tokens withdrawal after end', async () => {
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.drainRemainingToken({ from: owner });

    const totalSupply = await this.token.totalSupply();

    (await this.token.balanceOf(owner)).should.be.bignumber.equal(totalSupply);
    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(0);
  });
});
