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

const ELTCoinDynamicCrowdsale = artifacts.require(
  './ELTCoinDynamicCrowdsale.sol',
);
const ELTCoin = artifacts.require('./ELTCoin.sol');

contract('ELTCoinDynamicCrowdsale', accounts => {
  const owner = accounts[0];
  const wallet = accounts[0];
  const investor = accounts[1];

  const RATE_CHANGE_THRESHOLD = new BigNumber(30000000000000);
  const START_RATE = new BigNumber(320000);
  const CAP = ether(520);
  const MINIMUM_THRESHOLD = ether(0.1);
  const CAP_PER_ADDRESS = ether(30);
  const TOTAL_SUPPLY = ether(528).div(START_RATE * 10);

  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async () => {
    this.endTime = latestTime() + duration.weeks(1);
    this.afterEndTime = this.endTime + duration.minutes(1);
    this.token = await ELTCoin.new();
    this.crowdsale = await ELTCoinDynamicCrowdsale.new(
      this.token.address,
      this.endTime,
      START_RATE,
      CAP,
      MINIMUM_THRESHOLD,
      CAP_PER_ADDRESS,
      wallet,
    );
    await this.token.transfer(this.crowdsale.address, TOTAL_SUPPLY, {
      from: owner,
    });
  });

  it('should create crowdsale with correct parameters', async () => {
    this.crowdsale.should.exist;
    this.token.should.exist;

    (await this.crowdsale.endTime()).should.be.bignumber.equal(this.endTime);
    (await this.crowdsale.startRate()).should.be.bignumber.equal(START_RATE);
    (await this.crowdsale.wallet()).should.be.equal(wallet);
    (await this.crowdsale.minThreshold()).should.be.bignumber.equal(
      MINIMUM_THRESHOLD,
    );
    (await this.crowdsale.capPerAddress()).should.be.bignumber.equal(
      CAP_PER_ADDRESS,
    );
  });

  it('should accept payments during the sale', async () => {
    const investmentAmount = ether(0.2);
    const expectedTokenAmount = investmentAmount.div(START_RATE);

    web3.eth.sendTransaction({
      from: investor,
      to: this.crowdsale.address,
      value: investmentAmount,
      gas: 1000000,
      gasPrice: 40000000000,
    });

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(
      expectedTokenAmount,
    );

    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(TOTAL_SUPPLY.sub(expectedTokenAmount));

    (await this.crowdsale.currentRate()).should.be.bignumber.equal(START_RATE);

    (await this.crowdsale.tokensSold()).should.be.bignumber.equal(
      expectedTokenAmount,
    );
  });

  it('should compute right number of tokens when crossing a boundary', async () => {
    const investmentAmount = ether(10);

    const expectedTokenAmount1 = ether(9.6).div(START_RATE);
    const expectedTokenAmount2 = ether(0.4).div(START_RATE.mul(2));

    web3.eth.sendTransaction({
      from: investor,
      to: this.crowdsale.address,
      value: investmentAmount,
      gas: 1000000,
      gasPrice: 40000000000,
    });

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(
      expectedTokenAmount1.add(expectedTokenAmount2),
    );

    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(
      TOTAL_SUPPLY.sub(expectedTokenAmount1.add(expectedTokenAmount2)),
    );

    (await this.crowdsale.currentRate()).should.be.bignumber.equal(
      START_RATE.mul(2),
    );

    (await this.crowdsale.tokensSold()).should.be.bignumber.equal(
      expectedTokenAmount1.add(expectedTokenAmount2),
    );
  });

  it('should compute right number of tokens when crossing two boundaries', async () => {
    const investmentAmount = ether(30);

    const expectedTokenAmount1 = ether(9.6).div(START_RATE);
    const expectedTokenAmount2 = ether(19.2).div(START_RATE.mul(2));
    const expectedTokenAmount3 = ether(1.2).div(START_RATE.mul(3));

    web3.eth.sendTransaction({
      from: investor,
      to: this.crowdsale.address,
      value: investmentAmount,
      gas: 1000000,
      gasPrice: 40000000000,
    });

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(
      expectedTokenAmount1.add(expectedTokenAmount2).add(expectedTokenAmount3),
    );

    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(
      TOTAL_SUPPLY.sub(
        expectedTokenAmount1
          .add(expectedTokenAmount2)
          .add(expectedTokenAmount3),
      ),
    );

    (await this.crowdsale.currentRate()).should.be.bignumber.equal(
      START_RATE.mul(3),
    );

    (await this.crowdsale.tokensSold()).should.be.bignumber.equal(
      expectedTokenAmount1.add(expectedTokenAmount2).add(expectedTokenAmount3),
    );
  });

  it('should update price after crossing a boundary', async () => {
    const investmentAmount1 = ether(9.6);

    const expectedTokenAmount1 = investmentAmount1.div(START_RATE);

    web3.eth.sendTransaction({
      from: investor,
      to: this.crowdsale.address,
      value: investmentAmount1,
      gas: 1000000,
      gasPrice: 40000000000,
    });

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(
      expectedTokenAmount1,
    );

    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(TOTAL_SUPPLY.sub(expectedTokenAmount1));

    const investmentAmount2 = ether(1);

    const expectedTokenAmount2 = investmentAmount2.div(START_RATE.mul(2));

    web3.eth.sendTransaction({
      from: investor,
      to: this.crowdsale.address,
      value: investmentAmount2,
      gas: 1000000,
      gasPrice: 40000000000,
    });

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(
      expectedTokenAmount1.add(expectedTokenAmount2),
    );

    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(
      TOTAL_SUPPLY.sub(expectedTokenAmount1).sub(expectedTokenAmount2),
    );

    (await this.crowdsale.currentRate()).should.be.bignumber.equal(
      START_RATE.mul(2),
    );

    (await this.crowdsale.tokensSold()).should.be.bignumber.equal(
      expectedTokenAmount1.add(expectedTokenAmount2),
    );
  });

  it('should limit the rate when maxRate is set', async () => {
    await this.crowdsale.setMaxRate(START_RATE, {
      from: owner,
    });

    const investmentAmount = ether(10);
    const expectedTokenAmount = investmentAmount.div(START_RATE);

    web3.eth.sendTransaction({
      from: investor,
      to: this.crowdsale.address,
      value: investmentAmount,
      gas: 1000000,
      gasPrice: 40000000000,
    });

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(
      expectedTokenAmount,
    );

    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(TOTAL_SUPPLY.sub(expectedTokenAmount));

    (await this.crowdsale.currentRate()).should.be.bignumber.equal(START_RATE);

    (await this.crowdsale.tokensSold()).should.be.bignumber.equal(
      expectedTokenAmount,
    );
  });

  it('should reject payments with gas amount above threshold', async () => {
    await this.crowdsale
      .buyTokens(investor, {
        value: ether(0.2),
        from: investor,
        gasPrice: 50000000001,
      })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should reject payments below minimum threshold', async () => {
    await this.crowdsale
      .buyTokens(investor, {
        value: ether(0.01),
        from: investor,
        gasPrice: 40000000000,
      })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should accept payments below maximum individual cap', async () => {
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

  it('should reject payments above maximum individual cap', async () => {
    await this.crowdsale.buyTokens(investor, {
      value: ether(10),
      from: investor,
      gasPrice: 40000000000,
    }).should.be.fulfilled;

    await this.crowdsale.buyTokens(investor, {
      value: ether(20),
      from: investor,
      gasPrice: 40000000000,
    }).should.be.fulfilled;

    await this.crowdsale
      .buyTokens(investor, {
        value: ether(0.1),
        from: investor,
        gasPrice: 40000000000,
      })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should reject payments after end', async () => {
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
      .drainRemainingToken({
        from: owner,
      })
      .should.be.rejectedWith('invalid opcode');
  });

  it('should allow tokens withdrawal after end', async () => {
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.drainRemainingToken({
      from: owner,
    });

    const totalSupply = await this.token.totalSupply();

    (await this.token.balanceOf(owner)).should.be.bignumber.equal(totalSupply);
    (await this.token.balanceOf(
      this.crowdsale.address,
    )).should.be.bignumber.equal(0);
  });
});
