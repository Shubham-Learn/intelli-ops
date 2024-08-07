const mockEvent = { body: JSON.stringify({ prompt: 'Hello, world!', parameters: { max_new_tokens: 256, temperature: 0.1 } }) }; const mockContext = {}; const mockSmrClient = { invoke_endpoint: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({ Body: { read: jest.fn().mockReturnValue('{ "result": "Hello, world!" }') } }) }) }; const mockBoto3 = { client: jest.fn().mockReturnValue(mockSmrClient) }; jest.mock('boto3', () => mockBoto3); const lambdaHandler = require('./notebook/lambda_function.py'); test('Test lambda_handler with valid input', async () => { const result = await lambdaHandler.lambda_handler(mockEvent, mockContext); expect(result).toEqual({ statusCode: 200, body: JSON.stringify({ result: 'Hello, world!' }) }); });

const mockEvent = { body: JSON.stringify({ parameters: { max_new_tokens: 256, temperature: 0.1 } }) }; const mockContext = {}; const mockSmrClient = { invoke_endpoint: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({ Body: { read: jest.fn().mockReturnValue('{ "result": "" }') } }) }) }; const mockBoto3 = { client: jest.fn().mockReturnValue(mockSmrClient) }; jest.mock('boto3', () => mockBoto3); const lambdaHandler = require('./notebook/lambda_function.py'); test('Test lambda_handler with missing prompt', async () => { const result = await lambdaHandler.lambda_handler(mockEvent, mockContext); expect(result).toEqual({ statusCode: 200, body: JSON.stringify({ result: '' }) }); });

const mockEvent = { body: JSON.stringify({ prompt: 'Hello, world!', parameters: { invalid: true } }) }; const mockContext = {}; const mockSmrClient = { invoke_endpoint: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({ Body: { read: jest.fn().mockReturnValue('{ "result": "Hello, world!" }') } }) }) }; const mockBoto3 = { client: jest.fn().mockReturnValue(mockSmrClient) }; jest.mock('boto3', () => mockBoto3); const lambdaHandler = require('./notebook/lambda_function.py'); test('Test lambda_handler with invalid parameters', async () => { const result = await lambdaHandler.lambda_handler(mockEvent, mockContext); expect(result).toEqual({ statusCode: 200, body: JSON.stringify({ result: 'Hello, world!' }) }); });