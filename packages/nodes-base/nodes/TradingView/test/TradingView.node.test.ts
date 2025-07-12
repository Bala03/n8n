import {
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

import { TradingView } from '../TradingView.node';
import * as GenericFunctions from '../GenericFunctions';

const mockExecuteFunctions = {
	getInputData: jest.fn(),
	getNodeParameter: jest.fn(),
	getCredentials: jest.fn(),
	getNode: jest.fn(),
	continueOnFail: jest.fn(),
	helpers: {
		httpRequestWithAuthentication: jest.fn(),
	},
} as unknown as IExecuteFunctions;

describe('TradingView Node', () => {
	let tradingViewNode: TradingView;

	beforeEach(() => {
		tradingViewNode = new TradingView();
		jest.clearAllMocks();
	});

	describe('Node Configuration', () => {
		it('should have correct node configuration', () => {
			expect(tradingViewNode.description.name).toBe('tradingView');
			expect(tradingViewNode.description.displayName).toBe('TradingView');
			expect(tradingViewNode.description.group).toContain('input');
			expect(tradingViewNode.description.inputs).toEqual([NodeConnectionTypes.Main]);
			expect(tradingViewNode.description.outputs).toEqual([NodeConnectionTypes.Main]);
		});

		it('should have correct credentials configuration', () => {
			const credentials = tradingViewNode.description.credentials;
			expect(credentials).toHaveLength(1);
			expect(credentials![0].name).toBe('tradingViewApi');
			expect(credentials![0].required).toBe(true);
		});

		it('should have correct resource options', () => {
			const resourceProperty = tradingViewNode.description.properties.find(p => p.name === 'resource');
			expect(resourceProperty).toBeDefined();
			expect(resourceProperty!.type).toBe('options');
			
			const options = (resourceProperty as any).options;
			expect(options).toHaveLength(4);
			expect(options.map((o: any) => o.value)).toEqual(['marketData', 'scanner', 'overview', 'validation']);
		});
	});

	describe('Market Data Operations', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([{}]);
			(mockExecuteFunctions.getCredentials as jest.Mock).mockResolvedValue({
				sessionId: 'test-session',
				signature: 'test-signature',
				username: 'test-user',
				baseUrl: 'https://scanner.tradingview.com',
			});
			(mockExecuteFunctions.getNode as jest.Mock).mockReturnValue({ name: 'TradingView' });
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
		});

		it('should execute market data get operation successfully', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('marketData') // resource
				.mockReturnValueOnce('get') // operation
				.mockReturnValueOnce('america') // market
				.mockReturnValueOnce(50) // limit
				.mockReturnValueOnce(['name', 'close', 'volume']) // columns
				.mockReturnValueOnce('volume'); // sortBy

			// Mock successful API response
			(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
				.mockResolvedValueOnce({
					data: [
						{ name: 'AAPL', close: 150.00, volume: 1000000 },
						{ name: 'GOOGL', close: 2500.00, volume: 500000 },
					],
				});

			const result = await tradingViewNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('market', 'america');
			expect(result[0][0].json).toHaveProperty('count', 2);
			expect(result[0][0].json.data).toHaveLength(2);
		});

		it('should handle session validation failure', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('validation') // resource
				.mockReturnValueOnce('validate'); // operation

			// Mock failed validation
			(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
				.mockRejectedValueOnce(new Error('Authentication failed'));

			await expect(tradingViewNode.execute.call(mockExecuteFunctions))
				.rejects.toThrow(NodeOperationError);
		});

		it('should execute overview operation successfully', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('overview') // resource
				.mockReturnValueOnce('get'); // operation

			// Mock successful API responses for multiple markets
			(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
				.mockResolvedValue({
					data: [
						{ name: 'AAPL', close: 150.00, volume: 1000000 },
					],
				});

			const result = await tradingViewNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('operation', 'overview');
			expect(result[0][0].json).toHaveProperty('america');
			expect(result[0][0].json).toHaveProperty('europe');
			expect(result[0][0].json).toHaveProperty('asia');
		});
	});

	describe('Scanner Operations', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([{}]);
			(mockExecuteFunctions.getCredentials as jest.Mock).mockResolvedValue({
				sessionId: 'test-session',
				signature: 'test-signature',
				username: 'test-user',
				baseUrl: 'https://scanner.tradingview.com',
			});
			(mockExecuteFunctions.getNode as jest.Mock).mockReturnValue({ name: 'TradingView' });
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			
			// Mock validation success
			(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
				.mockResolvedValue({
					data: [
						{ name: 'AAPL', close: 150.00, change: 2.5, volume: 1000000 },
						{ name: 'GOOGL', close: 2500.00, change: -1.2, volume: 500000 },
					],
				});
		});

		it('should execute gainers scan successfully', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('scanner') // resource
				.mockReturnValueOnce('gainers') // operation
				.mockReturnValueOnce('america') // market
				.mockReturnValueOnce(50) // limit
				.mockReturnValueOnce(['name', 'close', 'change']); // columns

			const result = await tradingViewNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('operation', 'gainers');
			expect(result[0][0].json).toHaveProperty('market', 'america');
		});

		it('should execute custom scan with filters', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('scanner') // resource
				.mockReturnValueOnce('scan') // operation
				.mockReturnValueOnce('america') // market
				.mockReturnValueOnce(50) // limit
				.mockReturnValueOnce(['name', 'close', 'volume']) // columns
				.mockReturnValueOnce('volume') // sortBy
				.mockReturnValueOnce(true) // useCustomFilters
				.mockReturnValueOnce({
					filter: [
						{ left: 'market_cap_basic', operation: 'greater', right: '1000000000' },
					],
				}); // filters

			const result = await tradingViewNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('operation', 'scan');
		});
	});

	describe('Error Handling', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([{}]);
			(mockExecuteFunctions.getCredentials as jest.Mock).mockResolvedValue({
				sessionId: 'test-session',
				signature: 'test-signature',
				username: 'test-user',
				baseUrl: 'https://scanner.tradingview.com',
			});
			(mockExecuteFunctions.getNode as jest.Mock).mockReturnValue({ name: 'TradingView' });
		});

		it('should handle API errors gracefully when continue on fail is enabled', async () => {
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('marketData') // resource
				.mockReturnValueOnce('get'); // operation

			// Mock API error
			(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
				.mockRejectedValueOnce(new Error('API Error'));

			const result = await tradingViewNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error');
		});

		it('should throw error when continue on fail is disabled', async () => {
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('marketData') // resource
				.mockReturnValueOnce('get'); // operation

			// Mock API error
			(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
				.mockRejectedValueOnce(new Error('API Error'));

			await expect(tradingViewNode.execute.call(mockExecuteFunctions))
				.rejects.toThrow();
		});
	});
});

describe('GenericFunctions', () => {
	describe('tradingViewApiRequest', () => {
		it('should implement retry logic for rate limiting', async () => {
			const mockThis = {
				getCredentials: jest.fn().mockResolvedValue({
					sessionId: 'test-session',
					signature: 'test-signature',
					baseUrl: 'https://scanner.tradingview.com',
				}),
				helpers: {
					httpRequestWithAuthentication: jest.fn()
						.mockRejectedValueOnce({ httpCode: 429 }) // First call fails with rate limit
						.mockResolvedValueOnce({ data: 'success' }), // Second call succeeds
				},
				getNode: jest.fn().mockReturnValue({ name: 'TradingView' }),
			} as any;

			const result = await GenericFunctions.tradingViewApiRequest.call(
				mockThis,
				'POST',
				'/america/scan',
				{}
			);

			expect(result).toEqual({ data: 'success' });
			expect(mockThis.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		it('should handle authentication errors properly', async () => {
			const mockThis = {
				getCredentials: jest.fn().mockResolvedValue({
					sessionId: 'invalid-session',
					signature: 'invalid-signature',
					baseUrl: 'https://scanner.tradingview.com',
				}),
				helpers: {
					httpRequestWithAuthentication: jest.fn()
						.mockRejectedValue({ httpCode: 401 }),
				},
				getNode: jest.fn().mockReturnValue({ name: 'TradingView' }),
			} as any;

			await expect(
				GenericFunctions.tradingViewApiRequest.call(
					mockThis,
					'POST',
					'/america/scan',
					{}
				)
			).rejects.toThrow('Authentication failed');
		});
	});

	describe('getMarketData', () => {
		it('should fetch market data with default parameters', async () => {
			const mockThis = {
				getCredentials: jest.fn().mockResolvedValue({
					sessionId: 'test-session',
					signature: 'test-signature',
					baseUrl: 'https://scanner.tradingview.com',
				}),
				helpers: {
					httpRequestWithAuthentication: jest.fn()
						.mockResolvedValue({
							data: [
								{ name: 'AAPL', close: 150.00, volume: 1000000 },
							],
						}),
				},
				getNode: jest.fn().mockReturnValue({ name: 'TradingView' }),
			} as any;

			const result = await GenericFunctions.getMarketData.call(
				mockThis,
				'america'
			);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveProperty('name', 'AAPL');
		});
	});
});