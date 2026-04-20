class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    this.onStateChange = options.onStateChange || (() => {});
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceFailure >= this.resetTimeout) {
        this.setState('HALF-OPEN');
      } else {
        throw new CircuitBreakerError('Circuit breaker is open', 'CIRCUIT_OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF-OPEN') {
      this.setState('CLOSED');
      this.failureCount = 0;
    } else if (this.state === 'CLOSED') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF-OPEN') {
      this.setState('OPEN');
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.setState('OPEN');
    }
  }

  setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.onStateChange(oldState, newState);
      console.log(`[CircuitBreaker] State changed: ${oldState} → ${newState}`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout
    };
  }

  forceClose() {
    this.setState('CLOSED');
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  forceOpen() {
    this.setState('OPEN');
    this.lastFailureTime = Date.now();
  }
}

class CircuitBreakerError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.code = code;
  }
}

const circuitBreakerMiddleware = (breaker) => {
  return (req, res, next) => {
    req.circuitBreaker = breaker;
    req.circuitBreakerState = breaker.getState();
    next();
  };
};

class RetryPolicy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.delay = options.delay || 1000;
    this.backoff = options.backoff || 'exponential';
    this.retryOn = options.retryOn || this.defaultRetryOn;
    this.onRetry = options.onRetry || (() => {});
  }

  defaultRetryOn(error) {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' ||
           error.code === '503' ||
           error.status >= 500;
  }

  async execute(fn) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) {
          break;
        }

        if (!this.retryOn(error)) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        this.onRetry(attempt, error, delay);
        console.log(`[Retry] Attempt ${attempt + 1}/${this.maxRetries} failed, retrying in ${delay}ms`);
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  calculateDelay(attempt) {
    if (this.backoff === 'exponential') {
      return Math.min(this.delay * Math.pow(2, attempt), 30000);
    } else if (this.backoff === 'linear') {
      return this.delay * (attempt + 1);
    }
    return this.delay;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class Bulkhead {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 10;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.active = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.active >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueueSize) {
        throw new Error('Bulkhead queue is full');
      }
      
      return new Promise((resolve, reject) => {
        this.queue.push({ fn, resolve, reject });
      });
    }

    this.active++;
    try {
      const result = await fn();
      return result;
    } finally {
      this.active--;
      this.processQueue();
    }
  }

  processQueue() {
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const { fn, resolve, reject } = this.queue.shift();
      this.execute(fn).then(resolve).catch(reject);
    }
  }

  getStats() {
    return {
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize
    };
  }
}

export { 
  CircuitBreaker, 
  CircuitBreakerError, 
  circuitBreakerMiddleware,
  RetryPolicy,
  Bulkhead
};