const mockEvent = { body: JSON.stringify({ prompt: 'Hello', parameters: { max_new_tokens: 256, temperature: 0.1 } }) }; const mockContext = {}; const mockInvokeEndpoint = jest.fn().mockResolvedValue({ Body: { read: () => JSON.stringify({ result: 'Hello, world!' }) } }); const mockClient = { invokeEndpoint: mockInvokeEndpoint }; jest.mock('boto3', () => ({ client: jest.fn().mockReturnValue(mockClient) })); const lambdaFunction = require('./notebook/lambda_function'); test('lambda_handler function', async () => { const result = await lambdaFunction.lambda_handler(mockEvent, mockContext); expect(mockInvokeEndpoint).toHaveBeenCalledWith({ EndpointName: process.env.SAGEMAKER_ENDPOINT_NAME, Body: JSON.stringify({ inputs: 'Hello', parameters: { max_new_tokens: 256, temperature: 0.1 } }), ContentType: 'application/json' }); expect(result).toEqual({ statusCode: 200, body: JSON.stringify({ result: 'Hello, world!' }) }); });
