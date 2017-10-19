const BigNumber = web3.BigNumber;

const increaseTime = duration => {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id: id,
      },
      err1 => {
        if (err1) return reject(err1);

        web3.currentProvider.sendAsync(
          {
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: id + 1,
          },
          (err2, res) => {
            return err2 ? reject(err2) : resolve(res);
          },
        );
      },
    );
  });
};

const latestTime = () => web3.eth.getBlock('latest').timestamp;

module.exports = {
  assertJump: error => {
    assert.isAbove(
      error.message.search('invalid opcode'),
      -1,
      'Invalid opcode error must be returned',
    );
  },
  ether: n => new BigNumber(web3.toWei(n, 'ether')),
  latestTime,
  advanceBlock: () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync(
        {
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: Date.now(),
        },
        (err, res) => {
          return err ? reject(err) : resolve(res);
        },
      );
    });
  },
  duration: {
    seconds: val => val,
    minutes: val => val * 60,
    hours: val => val * 60 * 60,
    days: val => val * 24 * 60 * 60,
    weeks: val => val * 7 * 24 * 60 * 60,
    years: val => val * 365 * 24 * 60 * 60,
  },
  increaseTimeTo: target => {
    let now = latestTime();
    if (target < now)
      throw Error(
        `Cannot increase current time(${now}) to a moment in the past(${target})`,
      );
    let diff = target - now;
    return increaseTime(diff);
  },
};
