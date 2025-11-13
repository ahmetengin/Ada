# Logging in Ada Ecosystem

## Overview

Ada ecosystem now includes a structured logging system to replace console.log statements in production.

## Logger Usage

### TypeScript/JavaScript

All nodes inherit a logger from `BaseNode`:

```typescript
// In any node class that extends BaseNode
this.logger.info('Operation completed', { data: someData });
this.logger.warn('Warning message', { warning: details });
this.logger.error('Error occurred', { error: errorObj });
this.logger.debug('Debug info', { debug: data });
```

### Creating Standalone Loggers

```typescript
import { createLogger } from './core/utils/Logger.js';

const logger = createLogger('MyComponent');
logger.info('Component initialized');
```

## Log Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARN**: Warning messages for potentially harmful situations
- **ERROR**: Error messages for serious problems

## Configuration

### Set Log Level

```typescript
import { Logger, LogLevel } from './core/utils/Logger.js';

// Only show WARN and ERROR messages
Logger.setLogLevel(LogLevel.WARN);
```

### Disable Console Output

For production environments where you're using an external logging service:

```typescript
import { Logger } from './core/utils/Logger.js';

// Disable console output
Logger.setConsoleOutput(false);
```

## Migration from console.log

### Current State

The codebase contains ~686 console.log statements across 36 files:
- Most are in examples and demo files
- Some are in core services for debugging
- All are functional but not structured

### Migration Strategy

1. **High Priority** - Core services and production code
   - Replace with logger calls
   - Add structured data to logs

2. **Medium Priority** - Service implementations
   - Gradually migrate to logger
   - Keep console.log for demos/examples

3. **Low Priority** - Example and demo files
   - Can keep console.log for demonstration purposes
   - These files are not used in production

### Production Deployment

Before deploying to production:

```typescript
// In your main initialization file
import { Logger, LogLevel } from './core/utils/Logger.js';

// Set appropriate log level
Logger.setLogLevel(LogLevel.INFO); // or WARN for production

// Optionally disable console output if using external logging service
// Logger.setConsoleOutput(false);
```

## Future Enhancements

- Integration with external logging services (Sentry, DataDog, CloudWatch)
- Log rotation and archival
- Structured logging with correlation IDs
- Performance metrics logging
