
class Queue {
  constructor() {
    this.storage = [];
  }

  enq(val) {
    if (val) this.storage.push(val);
    return true;
  }

  deq() {
    let remove = this.storage[0]
    return this.storage.shift();
  }
}

module.exports = Queue;
