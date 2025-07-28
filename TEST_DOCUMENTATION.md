# Test Suite Documentation

## Overview

This document provides comprehensive information about the test suite for the Response Handler library. The test suite ensures reliability, correctness, and maintainability of all modules.

## Test Structure

```
src/
├── __tests__/
│   └── helpers/
│       └── mocks.ts              # Mock utilities and test helpers
├── responseTemplate.test.ts      # Response template engine tests
├── rest/
│   ├── response.test.ts         # REST response handlers tests
│   └── errorHandler.test.ts     # Express error middleware tests
├── socket/
│   ├── emitter.test.ts          # Socket.IO emitters tests
│   └── wrapper.test.ts          # Socket error wrapper tests
├── utils/
│   └── formatter.test.ts        # Response formatter tests
└── index.test.ts                # Integration and exports tests
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  rootDir: './src',
};
```

### Test Scripts
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode (if configured)
- `npm run test:coverage` - Run tests with coverage report (if configured)

## Test Coverage

### Module Coverage Summary

| Module | Tests | Coverage Focus |
|--------|-------|----------------|
| `responseTemplate.test.ts` | 15 tests | Template configuration, response formatting |
| `rest/response.test.ts` | 31 tests | Success/error responses, status codes, data handling |
| `rest/errorHandler.test.ts` | 15 tests | Error middleware, error forwarding, integration |
| `socket/emitter.test.ts` | 34 tests | Event emission, room targeting, error handling |
| `socket/wrapper.test.ts` | 35 tests | Error wrapping, async operations, edge cases |
| `utils/formatter.test.ts` | 12 tests | Format delegation, parameter handling |
| `index.test.ts` | 5 tests | Module exports, API surface, integration |

**Total: 147 tests**

## Test Categories

### 1. Unit Tests
- **Purpose**: Test individual functions in isolation
- **Coverage**: All public and internal functions
- **Mocking**: External dependencies are mocked

### 2. Integration Tests
- **Purpose**: Test module interactions and exports
- **Coverage**: Cross-module functionality
- **Focus**: API consistency and module boundaries

### 3. Edge Case Tests
- **Purpose**: Test boundary conditions and error scenarios
- **Coverage**: Null/undefined handling, type edge cases
- **Examples**: Empty data, circular references, async errors

## Test Helpers and Utilities

### Mock Utilities (`src/__tests__/helpers/mocks.ts`)

#### Express Mocks
```typescript
createMockResponse(): Partial<Response>
```
- Creates mock Express response object
- Includes `status()` and `json()` methods
- Returns chainable mock for testing

#### Socket.IO Mocks
```typescript
createMockSocket(): Partial<Socket>
```
- Creates mock Socket.IO socket object
- Includes `emit()` and `to()` methods
- Supports room and direct socket targeting

#### Test Data
```typescript
sampleUserData: { id: string, name: string, email: string }
sampleErrorData: { message: string, type: string, details: object }
```

#### Error Classes
```typescript
MockAppError: Custom error with statusCode, type, details
MockValidationError: Validation-specific error (422 status)
MockNotFoundError: Not found error (404 status)
```

## Test Patterns

### 1. Arrange-Act-Assert (AAA)
```typescript
it('should handle success response', () => {
  // Arrange
  const mockRes = createMockResponse();
  const data = { id: 1, name: 'Test' };
  
  // Act
  sendSuccess(mockRes as Response, data, 'Success message');
  
  // Assert
  expect(mockRes.status).toHaveBeenCalledWith(200);
  expect(mockRes.json).toHaveBeenCalledWith(expectedPayload);
});
```

### 2. Mock Reset Pattern
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Reset mocks to clean state
});
```

### 3. Parameter Validation
```typescript
it('should call function with correct parameters', () => {
  someFunction(param1, param2, param3);
  
  expect(mockFunction).toHaveBeenCalledWith(param1, param2, param3);
  expect(mockFunction).toHaveBeenCalledTimes(1);
});
```

### 4. Error Testing
```typescript
it('should handle errors correctly', async () => {
  const error = new MockAppError('Test error');
  mockHandler.mockRejectedValue(error);
  
  await wrappedFunction(params);
  
  expect(errorHandler).toHaveBeenCalledWith(error);
});
```

## Module-Specific Test Details

### Response Template Tests (`responseTemplate.test.ts`)
- **Custom template configuration**: Tests template function validation
- **Default behavior**: Verifies default response structure
- **Template persistence**: Ensures template survives multiple calls
- **Complex templates**: Tests conditional logic in templates

### REST Response Tests (`rest/response.test.ts`)
- **Success responses**: Various data types and messages
- **Error responses**: Different error types and status codes
- **Parameter validation**: Default values and edge cases
- **Integration**: Interaction with formatter utility

### Error Handler Tests (`rest/errorHandler.test.ts`)
- **Error forwarding**: Passes errors to sendError correctly
- **Express integration**: Works with Express middleware pattern
- **Error preservation**: Maintains all error properties
- **Context handling**: Works with different request contexts

### Socket Emitter Tests (`socket/emitter.test.ts`)
- **Event emission**: Basic emit functionality
- **Room targeting**: Emit to specific rooms
- **Socket targeting**: Emit to specific socket IDs
- **Data handling**: Complex data structures and types
- **Error emission**: Error event handling

### Socket Wrapper Tests (`socket/wrapper.test.ts`)
- **Error catching**: Sync and async error handling
- **Event resolution**: Event name from data or default
- **Handler execution**: Proper parameter forwarding
- **Edge cases**: Null data, undefined events, nested async
- **Concurrency**: Multiple handlers running simultaneously

### Utils Formatter Tests (`utils/formatter.test.ts`)
- **Parameter forwarding**: Correct delegation to template engine
- **Default values**: Parameter default handling
- **Type preservation**: Various data types maintained
- **Integration**: Works with response template system

### Integration Tests (`index.test.ts`)
- **Export verification**: All functions properly exported
- **API stability**: Consistent public interface
- **Module boundaries**: Separation between REST and Socket
- **Import patterns**: CommonJS and ES6 compatibility

## Running Tests

### Basic Test Run
```bash
npm test
```

### Watch Mode (if configured)
```bash
npm run test:watch
```

### Coverage Report (if configured)
```bash
npm run test:coverage
```

### Specific Test File
```bash
npx jest responseTemplate.test.ts
```

### Specific Test Pattern
```bash
npx jest --testNamePattern="should handle success"
```

## Test Maintenance

### Adding New Tests
1. Follow existing naming conventions
2. Use appropriate test helpers from `mocks.ts`
3. Include edge cases and error scenarios
4. Update this documentation if adding new patterns

### Updating Tests
1. Maintain backward compatibility in test helpers
2. Update related tests when changing functionality
3. Ensure mocks match actual implementation signatures

### Debugging Tests
1. Use `console.log` in tests for debugging
2. Run specific test files to isolate issues
3. Check mock call counts and parameters
4. Verify async test completion with proper awaits

## Best Practices

### 1. Test Independence
- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test execution order

### 2. Descriptive Test Names
```typescript
// Good
it('should emit error event when handler throws synchronous error')

// Bad
it('should handle errors')
```

### 3. Mock Management
- Reset mocks between tests
- Verify mock calls and parameters
- Use specific mocks for specific scenarios

### 4. Async Testing
```typescript
// Proper async test handling
it('should handle async operations', async () => {
  await asyncFunction();
  expect(result).toBe(expected);
});
```

### 5. Error Testing
```typescript
// Test both success and failure paths
it('should handle successful operation', () => { /* test */ });
it('should handle operation failure', () => { /* test */ });
```

## Continuous Integration

The test suite is designed to run in CI/CD environments:
- No external dependencies required
- All tests use mocks and stubs
- Fast execution (typically under 5 seconds)
- Clear failure reporting

## Future Enhancements

### Potential Additions
1. **Performance tests**: Measure response times
2. **Load tests**: Test with high volumes
3. **Property-based tests**: Generate random test data
4. **Visual regression tests**: For documentation examples
5. **Contract tests**: API compatibility validation

### Coverage Goals
- Maintain 100% function coverage
- Increase branch coverage for complex conditionals
- Add mutation testing for robust test validation

## Troubleshooting

### Common Issues

1. **Mock not being called**: Check function signatures and parameter matching
2. **Async test failures**: Ensure proper `await` usage
3. **Type errors**: Update mocks to match TypeScript interfaces
4. **Intermittent failures**: Check for shared state between tests

### Debug Commands
```bash
# Run with verbose output
npx jest --verbose

# Run specific test with debugging
npx jest --testNamePattern="specific test" --verbose

# Check test coverage
npx jest --coverage
```

This comprehensive test suite ensures the Response Handler library maintains high quality and reliability across all supported use cases.
