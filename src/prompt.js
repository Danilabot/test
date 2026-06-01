const readline = require('readline');

function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const buffered = [];
  const waiting = [];
  let closed = false;

  rl.on('line', (line) => {
    if (waiting.length > 0) {
      waiting.shift()(line);
    } else {
      buffered.push(line);
    }
  });

  rl.on('close', () => {
    closed = true;
    while (waiting.length > 0) {
      waiting.shift()(null);
    }
  });

  function nextLine() {
    if (buffered.length > 0) {
      return Promise.resolve(buffered.shift());
    }
    if (closed) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => waiting.push(resolve));
  }

  async function ask(question) {
    process.stdout.write(question);
    const line = await nextLine();
    if (line === null) {
      throw new Error('Ввод прерван');
    }
    return line.trim();
  }

  async function askNumber(question, min, max) {
    while (true) {
      const answer = await ask(question);
      const value = Number(answer);
      if (Number.isInteger(value) && value >= min && value <= max) {
        return value;
      }
      console.log(`Введите число от ${min} до ${max}.`);
    }
  }

  async function askYesNo(question) {
    while (true) {
      const answer = (await ask(question)).toLowerCase();
      if (answer === 'y' || answer === 'yes' || answer === 'да' || answer === 'д') {
        return true;
      }
      if (answer === 'n' || answer === 'no' || answer === 'нет' || answer === 'н') {
        return false;
      }
      console.log('Ответьте y или n.');
    }
  }

  function close() {
    rl.close();
  }

  return { ask, askNumber, askYesNo, close };
}

module.exports = { createPrompt };
