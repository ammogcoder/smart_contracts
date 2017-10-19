var ELTCoin = artifacts.require('./ELTCoin.sol');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('ELTCoin', function(accounts) {
  let token;

  const assertJump = error => {
    assert.isAbove(
      error.message.search('invalid opcode'),
      -1,
      'Invalid opcode error must be returned',
    );
  };

  beforeEach(async function() {
    token = await ELTCoin.new();
  });

  it('should return the correct totalSupply after construction', async function() {
    let totalSupply = await token.totalSupply();

    assert.equal(totalSupply, 10000000000000000);
  });

  it('should throw error while approval (before exchangeReady)', async function() {
    let token = await ELTCoin.new();
    try {
      await token.approve(accounts[1], 100);
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should return the correct allowance amount after approval (after exchangeReady)', async function() {
    let token = await ELTCoin.new();
    await token.makePresaleReady();
    await token.approve(accounts[1], 10000000000000000);
    let allowance = await token.allowance(accounts[0], accounts[1]);

    assert.equal(allowance, 10000000000000000);
  });

  it('should return correct balances after transfer', async function() {
    let token = await ELTCoin.new();
    await token.transfer(accounts[1], 10000000000000000);
    let balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0.valueOf(), 0);

    let balance1 = await token.balanceOf(accounts[1]);
    assert.equal(balance1, 10000000000000000);
  });

  it('should throw an error when trying to transfer more than balance', async function() {
    let token = await ELTCoin.new();
    try {
      await token.transfer(accounts[1], 10000000000000002);
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should throw an error while transfering from another account (before exchangeReady)', async function() {
    let token = await ELTCoin.new();
    try {
      await token.approve(accounts[1], 100);
      await token.transferFrom(accounts[0], accounts[2], 100, {
        from: accounts[1],
      });
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should return correct balances after transfering from another account (after exchangeReady)', async function() {
    let token = await ELTCoin.new();
    await token.makePresaleReady();
    await token.approve(accounts[1], 100);
    await token.transferFrom(accounts[0], accounts[2], 100, {
      from: accounts[1],
    });

    let balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0, 9999999999999900);

    let balance1 = await token.balanceOf(accounts[2]);
    assert.equal(balance1, 100);

    let balance2 = await token.balanceOf(accounts[1]);
    assert.equal(balance2, 0);
  });

  it('should throw an error when trying to transfer more than allowed (before exchangeReady)', async function() {
    let token = await ELTCoin.new();
    try {
      await token.approve(accounts[1], 99);
      await token.transferFrom(accounts[0], accounts[2], 100, {
        from: accounts[1],
      });
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should throw an error when trying to transfer more than allowed (after exchangeReady)', async function() {
    let token = await ELTCoin.new();
    await token.makePresaleReady();
    await token.approve(accounts[1], 99);
    try {
      await token.transferFrom(accounts[0], accounts[2], 100, {
        from: accounts[1],
      });
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should throw an error when trying to transferFrom more than _from has (before exchangeReady)', async function() {
    let token = await ELTCoin.new();
    let balance0 = await token.balanceOf(accounts[0]);
    try {
      await token.approve(accounts[1], 99);
      await token.transferFrom(accounts[0], accounts[2], balance0 + 1, {
        from: accounts[1],
      });
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should throw an error when trying to transferFrom more than _from has (after exchangeReady)', async function() {
    let token = await ELTCoin.new();
    await token.makePresaleReady();
    let balance0 = await token.balanceOf(accounts[0]);
    await token.approve(accounts[1], 99);
    try {
      await token.transferFrom(accounts[0], accounts[2], balance0 + 1, {
        from: accounts[1],
      });
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  describe('validating allowance updates to spender', function() {
    let preApproved;

    it('should start with zero', async function() {
      let token = await ELTCoin.new();
      preApproved = await token.allowance(accounts[0], accounts[1]);
      assert.equal(preApproved, 0);
    });

    it('should throw an error while decreasing allowance (before exchangeReady)', async function() {
      let token = await ELTCoin.new();
      await token.makePresaleReady();
      try {
        await token.increaseApproval(accounts[1], 50);
      } catch (error) {
        assertJump(error);
      }
    });

    it('should increase by 50 then decrease by 10 (after exchangeReady)', async function() {
      let token = await ELTCoin.new();
      await token.makePresaleReady();
      await token.increaseApproval(accounts[1], 50);
      let postIncrease = await token.allowance(accounts[0], accounts[1]);
      preApproved.plus(50).should.be.bignumber.equal(postIncrease);
      await token.decreaseApproval(accounts[1], 10);
      let postDecrease = await token.allowance(accounts[0], accounts[1]);
      postIncrease.minus(10).should.be.bignumber.equal(postDecrease);
    });
  });

  it('should throw an error while increasing allowance (before exchangeReady)', async function() {
    let token = await ELTCoin.new();
    await token.makePresaleReady();
    try {
      await token.approve(accounts[1], 50);
    } catch (error) {
      assertJump(error);
    }
  });

  it('should increase by 50 then set to 0 when decreasing by more than 50 (after exchangeReady)', async function() {
    let token = await ELTCoin.new();
    await token.makePresaleReady();
    await token.approve(accounts[1], 50);
    await token.decreaseApproval(accounts[1], 60);
    let postDecrease = await token.allowance(accounts[0], accounts[1]);
    postDecrease.should.be.bignumber.equal(0);
  });

  it('should throw an error when trying to transfer to 0x0 (before exchangeReady)', async function() {
    let token = await ELTCoin.new();
    try {
      let transfer = await token.transfer(0x0, 100);
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should throw an error when trying to transfer to 0x0 (after exchangeReady)', async function() {
    let token = await ELTCoin.new();
    await token.makePresaleReady();
    try {
      let transfer = await token.transfer(0x0, 100);
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should throw an error when trying to transferFrom to 0x0 (before exchangeReady)', async function() {
    let token = await ELTCoin.new();

    try {
      await token.approve(accounts[1], 100);
      let transfer = await token.transferFrom(accounts[0], 0x0, 100, {
        from: accounts[1],
      });
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should throw an error when trying to transferFrom to 0x0 (after exchangeReady)', async function() {
    let token = await ELTCoin.new();
    await token.makePresaleReady();
    await token.approve(accounts[1], 100);
    try {
      let transfer = await token.transferFrom(accounts[0], 0x0, 100, {
        from: accounts[1],
      });
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }
  });
});
