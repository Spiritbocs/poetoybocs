// Debug logging utility for tracing API calls and responses
export interface LogMessage {
  type: 'api' | 'error' | 'info'
  timestamp: number
  message: string
  data?: any
}

class DebugLogger {
  private logs: LogMessage[] = []
  private maxSize = 100
  private listeners: Array<(log: LogMessage) => void> = []

  log(type: 'api' | 'error' | 'info', message: string, data?: any) {
    const entry: LogMessage = {
      type,
      timestamp: Date.now(),
      message,
      data: this.sanitize(data)
    }
    this.logs.unshift(entry) // newest first
    if (this.logs.length > this.maxSize) {
      this.logs.pop() // remove oldest
    }
    // Notify listeners
    this.listeners.forEach(listener => listener(entry))
    // Also console log for immediate visibility
    const method = type === 'error' ? console.error : console.log
    method(`[${type}] ${message}`, data !== undefined ? data : '')
  }

  // Remove sensitive data or very large objects
  private sanitize(data: any): any {
    if (data === undefined) return undefined
    if (data === null) return null
    
    try {
      // Create a safe copy for large objects
      if (typeof data === 'object') {
        // Special case for errors
        if (data instanceof Error) {
          return {
            message: data.message,
            stack: data.stack,
            name: data.name
          }
        }
        
        // For other objects/arrays, do a safe stringify with circular ref protection
        // and size limits to avoid blowing up the log
        const seen = new WeakSet()
        return JSON.parse(JSON.stringify(data, (key, value) => {
          // Skip some large arrays to keep logs manageable
          if (Array.isArray(value) && value.length > 30) {
            return `[Array(${value.length})]`
          }

          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]'
            }
            seen.add(value)
          }
          return value
        }))
      }
      return data
    } catch (e) {
      return '[Sanitization Error]'
    }
  }

  getLogs(type?: 'api' | 'error' | 'info') {
    if (type) {
      return this.logs.filter(log => log.type === type)
    }
    return this.logs
  }

  clear() {
    this.logs = []
  }

  addListener(listener: (log: LogMessage) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
}

export const logger = new DebugLogger()
