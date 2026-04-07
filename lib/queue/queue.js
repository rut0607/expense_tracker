// Simple in-memory queue for development
class SimpleQueue {
  constructor() {
    this.jobs = []
    this.processing = false
  }

  async add(name, data) {
    const job = {
      id: Date.now() + Math.random(),
      name,
      data,
      createdAt: new Date()
    }
    this.jobs.push(job)
    
    if (!this.processing) {
      this.process()
    }
    
    return job
  }

  async process() {
    this.processing = true
    
    while (this.jobs.length > 0) {
      const job = this.jobs.shift()
      try {
        await this.handlers[job.name]?.(job.data)
      } catch (error) {
        console.error(`Failed to process job ${job.name}:`, error)
      }
    }
    
    this.processing = false
  }

  handlers = {}

  register(name, handler) {
    this.handlers[name] = handler
  }
}

export const queue = new SimpleQueue()