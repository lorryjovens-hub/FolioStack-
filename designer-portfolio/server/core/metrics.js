import promClient from 'prom-client';
import os from 'os';
import { EventEmitter } from 'events';

class MetricsCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registry = options.registry || new promClient.Registry();
    this.prefix = options.prefix || 'foliostack_';
    this.collectDefaultMetrics = options.collectDefaultMetrics !== false;
    
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.summaries = new Map();

    this.initialize();
  }

  initialize() {
    if (this.collectDefaultMetrics) {
      promClient.collectDefaultMetrics({
        register: this.registry,
        prefix: this.prefix
      });
    }

    this.createCustomMetrics();
    this.startNodeMetricsCollection();
  }

  createCustomMetrics() {
    this.httpRequestsTotal = this.createCounter('http_requests_total', 'Total HTTP requests', ['method', 'path', 'status']);
    this.httpRequestDuration = this.createHistogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'path']);
    this.httpRequestSize = this.createHistogram('http_request_size_bytes', 'HTTP request size', ['method', 'path']);
    this.httpResponseSize = this.createHistogram('http_response_size_bytes', 'HTTP response size', ['method', 'path']);
    this.httpErrorsTotal = this.createCounter('http_errors_total', 'Total HTTP errors', ['method', 'path', 'status']);
    
    this.dbQueriesTotal = this.createCounter('db_queries_total', 'Total database queries', ['table', 'operation']);
    this.dbQueryDuration = this.createHistogram('db_query_duration_seconds', 'Database query duration', ['table', 'operation']);
    this.dbErrorsTotal = this.createCounter('db_errors_total', 'Total database errors', ['table', 'operation']);
    
    this.cacheHitsTotal = this.createCounter('cache_hits_total', 'Total cache hits', ['cache']);
    this.cacheMissesTotal = this.createCounter('cache_misses_total', 'Total cache misses', ['cache']);
    
    this.activeConnections = this.createGauge('active_connections', 'Active connections');
    this.queueSize = this.createGauge('queue_size', 'Queue size', ['queue']);
    
    this.taskProcessedTotal = this.createCounter('task_processed_total', 'Total tasks processed', ['queue', 'status']);
    this.taskProcessingTime = this.createHistogram('task_processing_time_seconds', 'Task processing time', ['queue']);
  }

  createCounter(name, help, labels = []) {
    const fullName = this.prefix + name;
    if (this.counters.has(fullName)) {
      return this.counters.get(fullName);
    }

    const counter = new promClient.Counter({
      name: fullName,
      help,
      labelNames: labels,
      registers: [this.registry]
    });

    this.counters.set(fullName, counter);
    return counter;
  }

  createGauge(name, help, labels = []) {
    const fullName = this.prefix + name;
    if (this.gauges.has(fullName)) {
      return this.gauges.get(fullName);
    }

    const gauge = new promClient.Gauge({
      name: fullName,
      help,
      labelNames: labels,
      registers: [this.registry]
    });

    this.gauges.set(fullName, gauge);
    return gauge;
  }

  createHistogram(name, help, labels = [], buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) {
    const fullName = this.prefix + name;
    if (this.histograms.has(fullName)) {
      return this.histograms.get(fullName);
    }

    const histogram = new promClient.Histogram({
      name: fullName,
      help,
      labelNames: labels,
      buckets,
      registers: [this.registry]
    });

    this.histograms.set(fullName, histogram);
    return histogram;
  }

  createSummary(name, help, labels = [], percentiles = [0.01, 0.05, 0.5, 0.95, 0.99]) {
    const fullName = this.prefix + name;
    if (this.summaries.has(fullName)) {
      return this.summaries.get(fullName);
    }

    const summary = new promClient.Summary({
      name: fullName,
      help,
      labelNames: labels,
      percentiles,
      registers: [this.registry]
    });

    this.summaries.set(fullName, summary);
    return summary;
  }

  recordHttpRequest(method, path, status, duration, requestSize, responseSize) {
    this.httpRequestsTotal.inc({ method, path, status: String(status) });
    this.httpRequestDuration.observe({ method, path }, duration);
    
    if (requestSize) {
      this.httpRequestSize.observe({ method, path }, requestSize);
    }
    if (responseSize) {
      this.httpResponseSize.observe({ method, path }, responseSize);
    }

    if (status >= 400) {
      this.httpErrorsTotal.inc({ method, path, status: String(status) });
    }
  }

  recordDatabaseQuery(table, operation, duration, success = true) {
    this.dbQueriesTotal.inc({ table, operation });
    this.dbQueryDuration.observe({ table, operation }, duration);
    
    if (!success) {
      this.dbErrorsTotal.inc({ table, operation });
    }
  }

  recordCacheHit(cache) {
    this.cacheHitsTotal.inc({ cache });
  }

  recordCacheMiss(cache) {
    this.cacheMissesTotal.inc({ cache });
  }

  recordTask(queue, status, duration) {
    this.taskProcessedTotal.inc({ queue, status });
    this.taskProcessingTime.observe({ queue }, duration);
  }

  setActiveConnections(count) {
    this.activeConnections.set(count);
  }

  setQueueSize(queue, size) {
    this.queueSize.set({ queue }, size);
  }

  startNodeMetricsCollection() {
    this.nodeMetrics = this.createGauge('node_info', 'Node.js info', ['version', 'platform', 'arch']);
    this.nodeMetrics.set({ 
      version: process.version, 
      platform: process.platform, 
      arch: process.arch 
    }, 1);

    this.memoryUsage = this.createGauge('process_memory_usage_bytes', 'Process memory usage', ['type']);
    this.cpuUsage = this.createGauge('process_cpu_usage_seconds_total', 'Process CPU usage');

    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);

      const cpuUsage = process.cpuUsage();
      this.cpuUsage.set((cpuUsage.user + cpuUsage.system) / 1000000);
    }, 5000);
  }

  getMetrics() {
    return this.registry.metrics();
  }

  getMetricsContentType() {
    return this.registry.contentType;
  }

  reset() {
    this.registry.reset();
  }

  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      const method = req.method;
      const path = req.route?.path || req.path;

      const requestSize = parseInt(req.headers['content-length']) || 0;

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const responseSize = parseInt(res.getHeader('content-length')) || 0;
        
        this.recordHttpRequest(method, path, res.statusCode, duration, requestSize, responseSize);
      });

      next();
    };
  }

  metricsEndpoint() {
    return async (req, res) => {
      try {
        const metrics = await this.getMetrics();
        res.setHeader('Content-Type', this.getMetricsContentType());
        res.end(metrics);
      } catch (error) {
        res.status(500).send(error.message);
      }
    };
  }
}

class HealthChecker {
  constructor(options = {}) {
    this.checks = new Map();
    this.options = options;
  }

  addCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      timeout: options.timeout || 5000,
      critical: options.critical !== false
    });
  }

  async check() {
    const results = {};
    let allHealthy = true;

    for (const [name, check] of this.checks) {
      try {
        const result = await Promise.race([
          check.fn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), check.timeout)
          )
        ]);

        results[name] = {
          status: 'healthy',
          ...result
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message
        };

        if (check.critical) {
          allHealthy = false;
        }
      }
    }

    return {
      status: allHealthy ? 'pass' : 'fail',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      checks: results
    };
  }

  endpoint() {
    return async (req, res) => {
      const result = await this.check();
      const statusCode = result.status === 'pass' ? 200 : 503;
      res.status(statusCode).json(result);
    };
  }
}

export { MetricsCollector, HealthChecker };