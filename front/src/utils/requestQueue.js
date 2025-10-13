// src/utils/requestQueue.js
class RequestQueue {
  constructor(maxConcurrent = 3, delayBetweenRequests = 500) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetweenRequests = delayBetweenRequests;
    this.running = 0;
    this.queue = [];
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        requestFn,
        resolve,
        reject
      });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { requestFn, resolve, reject } = this.queue.shift();

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      
      // Add delay before processing next request
      if (this.queue.length > 0) {
        setTimeout(() => this.process(), this.delayBetweenRequests);
      } else {
        this.process(); // Process immediately if no delay needed
      }
    }
  }
}

// Create a global request queue instance
export const requestQueue = new RequestQueue(2, 1000); // Max 2 concurrent, 1 second delay
