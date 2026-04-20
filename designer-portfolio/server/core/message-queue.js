import amqp from 'amqplib';
import { EventEmitter } from 'events';

class MessageQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.connection = null;
    this.channel = null;
    this.url = options.url || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    this.exchanges = new Map();
    this.queues = new Map();
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxRetries = options.maxRetries || 10;
    this.retryCount = 0;
  }

  async connect() {
    try {
      console.log('[MQ] Connecting to RabbitMQ...');
      
      this.connection = await amqp.connect(this.url);
      
      this.connection.on('error', (err) => {
        console.error('[MQ] Connection error:', err);
        this.handleConnectionError();
      });

      this.connection.on('close', () => {
        console.warn('[MQ] Connection closed');
        this.handleConnectionError();
      });

      this.channel = await this.connection.createChannel();
      
      this.channel.on('error', (err) => {
        console.error('[MQ] Channel error:', err);
      });

      this.channel.on('close', () => {
        console.warn('[MQ] Channel closed');
      });

      this.retryCount = 0;
      this.emit('connected');
      console.log('[MQ] Connected successfully');
      
      return this;
    } catch (error) {
      console.error('[MQ] Connection failed:', error);
      this.handleConnectionError();
      throw error;
    }
  }

  async handleConnectionError() {
    if (this.retryCount >= this.maxRetries) {
      console.error('[MQ] Max reconnection attempts reached');
      this.emit('disconnected');
      return;
    }

    this.retryCount++;
    console.log(`[MQ] Reconnecting (${this.retryCount}/${this.maxRetries})...`);
    
    setTimeout(() => {
      this.connect().catch(() => {});
    }, this.reconnectInterval);
  }

  async assertExchange(name, type = 'topic', options = {}) {
    const defaultOptions = {
      durable: true,
      autoDelete: false,
      ...options
    };

    await this.channel.assertExchange(name, type, defaultOptions);
    this.exchanges.set(name, { type, options: defaultOptions });
    
    console.log(`[MQ] Exchange asserted: ${name} (${type})`);
    return this;
  }

  async assertQueue(name, options = {}) {
    const defaultOptions = {
      durable: true,
      autoDelete: false,
      deadLetterExchange: options.deadLetterExchange || 'dlx',
      ...options
    };

    await this.channel.assertQueue(name, defaultOptions);
    this.queues.set(name, { options: defaultOptions });
    
    console.log(`[MQ] Queue asserted: ${name}`);
    return this;
  }

  async bindQueue(queue, exchange, routingKey = '') {
    await this.channel.bindQueue(queue, exchange, routingKey);
    console.log(`[MQ] Queue bound: ${queue} → ${exchange} (${routingKey})`);
    return this;
  }

  async publish(exchange, routingKey, message, options = {}) {
    const defaultOptions = {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
      messageId: options.messageId || require('crypto').randomUUID(),
      ...options
    };

    const content = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));
    
    const published = this.channel.publish(
      exchange,
      routingKey,
      content,
      defaultOptions
    );

    if (!published) {
      console.warn('[MQ] Message not published (buffer full)');
    }

    console.log(`[MQ] Message published: ${exchange}/${routingKey}`);
    return published;
  }

  async sendToQueue(queue, message, options = {}) {
    const defaultOptions = {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
      messageId: options.messageId || require('crypto').randomUUID(),
      ...options
    };

    const content = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));
    
    const sent = this.channel.sendToQueue(queue, content, defaultOptions);
    
    console.log(`[MQ] Message sent to queue: ${queue}`);
    return sent;
  }

  async consume(queue, handler, options = {}) {
    const defaultOptions = {
      noAck: false,
      prefetch: options.prefetch || 1,
      ...options
    };

    if (defaultOptions.prefetch) {
      await this.channel.prefetch(defaultOptions.prefetch);
    }

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const content = msg.content.toString();
        const message = msg.properties.contentType === 'application/json' 
          ? JSON.parse(content) 
          : content;

        await handler(message, {
          fields: msg.fields,
          properties: msg.properties,
          ack: () => this.channel.ack(msg),
          nack: (requeue = true) => this.channel.nack(msg, false, requeue),
          reject: (requeue = false) => this.channel.reject(msg, requeue)
        });

        if (!defaultOptions.noAck) {
          this.channel.ack(msg);
        }
      } catch (error) {
        console.error('[MQ] Consumer error:', error);
        if (!defaultOptions.noAck) {
          this.channel.nack(msg, false, true);
        }
      }
    }, defaultOptions);

    console.log(`[MQ] Consumer started for queue: ${queue}`);
    return this;
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    console.log('[MQ] Connection closed');
  }
}

class TaskQueue {
  constructor(mq, options = {}) {
    this.mq = mq;
    this.queueName = options.queueName || 'tasks';
    this.exchangeName = options.exchangeName || 'tasks';
    this.deadLetterQueue = options.deadLetterQueue || 'tasks.dlq';
  }

  async initialize() {
    await this.mq.assertExchange(this.exchangeName, 'direct', { durable: true });
    await this.mq.assertQueue(this.deadLetterQueue, { durable: true });
    await this.mq.assertQueue(this.queueName, {
      durable: true,
      deadLetterExchange: '',
      deadLetterRoutingKey: this.deadLetterQueue
    });
    await this.mq.bindQueue(this.queueName, this.exchangeName, '');
  }

  async enqueue(task, priority = 0) {
    const message = {
      id: require('crypto').randomUUID(),
      type: task.type,
      payload: task.payload,
      priority,
      createdAt: new Date().toISOString()
    };

    await this.mq.publish(this.exchangeName, '', message, { priority });
    return message.id;
  }

  async process(handler, concurrency = 1) {
    await this.mq.consume(this.queueName, handler, { prefetch: concurrency });
  }
}

class EventBus {
  constructor(mq, options = {}) {
    this.mq = mq;
    this.exchangeName = options.exchangeName || 'events';
    this.subscribers = new Map();
  }

  async initialize() {
    await this.mq.assertExchange(this.exchangeName, 'fanout', { durable: true });
  }

  async publish(eventType, payload) {
    const event = {
      id: require('crypto').randomUUID(),
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };

    await this.mq.publish(this.exchangeName, '', event);
    return event.id;
  }

  async subscribe(eventType, handler, queueName = null) {
    const queue = queueName || `events.${eventType}.${require('crypto').randomUUID().substr(0, 8)}`;
    
    await this.mq.assertQueue(queue, { exclusive: !queueName, durable: true });
    await this.mq.bindQueue(queue, this.exchangeName, '');
    
    await this.mq.consume(queue, (event, { ack }) => {
      if (event.type === eventType || eventType === '#') {
        handler(event);
      }
      ack();
    });

    this.subscribers.set(queue, { eventType, handler });
    return queue;
  }

  async unsubscribe(queue) {
    this.subscribers.delete(queue);
  }
}

export { MessageQueue, TaskQueue, EventBus };