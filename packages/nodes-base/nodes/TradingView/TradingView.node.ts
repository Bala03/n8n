import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	tradingViewApiRequest,
	tradingViewApiRequestAllItems,
	getMarketData,
	validateSession,
	getMarketOverview,
} from './GenericFunctions';

export class TradingView implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TradingView',
		name: 'tradingView',
		icon: 'file:tradingview.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume TradingView API with robust error handling and global session management',
		defaults: {
			name: 'TradingView',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'tradingViewApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Market Data',
						value: 'marketData',
					},
					{
						name: 'Stock Scanner',
						value: 'scanner',
					},
					{
						name: 'Market Overview',
						value: 'overview',
					},
					{
						name: 'Session Validation',
						value: 'validation',
					},
				],
				default: 'marketData',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['marketData'],
					},
				},
				options: [
					{
						name: 'Get Market Data',
						value: 'get',
						description: 'Get stock market data for a specific market',
						action: 'Get market data',
					},
					{
						name: 'Get All Markets Data',
						value: 'getAll',
						description: 'Get comprehensive data from all markets',
						action: 'Get all markets data',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['scanner'],
					},
				},
				options: [
					{
						name: 'Scan Stocks',
						value: 'scan',
						description: 'Scan stocks with custom filters',
						action: 'Scan stocks',
					},
					{
						name: 'Get Top Gainers',
						value: 'gainers',
						description: 'Get top gaining stocks',
						action: 'Get top gainers',
					},
					{
						name: 'Get Top Losers',
						value: 'losers',
						description: 'Get top losing stocks',
						action: 'Get top losers',
					},
					{
						name: 'Get Most Active',
						value: 'active',
						description: 'Get most actively traded stocks',
						action: 'Get most active stocks',
					},
				],
				default: 'scan',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['overview'],
					},
				},
				options: [
					{
						name: 'Get Overview',
						value: 'get',
						description: 'Get comprehensive market overview',
						action: 'Get market overview',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['validation'],
					},
				},
				options: [
					{
						name: 'Validate Session',
						value: 'validate',
						description: 'Validate TradingView session credentials',
						action: 'Validate session',
					},
				],
				default: 'validate',
			},
			// Market selection
			{
				displayName: 'Market',
				name: 'market',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['marketData', 'scanner'],
						operation: ['get', 'scan', 'gainers', 'losers', 'active'],
					},
				},
				options: [
					{
						name: 'America',
						value: 'america',
					},
					{
						name: 'Europe',
						value: 'europe',
					},
					{
						name: 'Asia',
						value: 'asia',
					},
					{
						name: 'Australia',
						value: 'australia',
					},
					{
						name: 'Canada',
						value: 'canada',
					},
					{
						name: 'India',
						value: 'india',
					},
				],
				default: 'america',
				description: 'The market to query',
			},
			// Limit
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['marketData', 'scanner'],
					},
				},
				default: 50,
				description: 'Max number of results to return',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
			},
			// Columns to fetch
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['marketData', 'scanner'],
					},
				},
				options: [
					{ name: 'Name', value: 'name' },
					{ name: 'Logo ID', value: 'logoid' },
					{ name: 'Close Price', value: 'close' },
					{ name: 'Change', value: 'change' },
					{ name: 'Change Absolute', value: 'change_abs' },
					{ name: 'Volume', value: 'volume' },
					{ name: 'Market Cap', value: 'market_cap_basic' },
					{ name: 'P/E Ratio', value: 'price_earnings_ttm' },
					{ name: 'EPS', value: 'earnings_per_share_basic_ttm' },
					{ name: 'High 52w', value: 'High.52W' },
					{ name: 'Low 52w', value: 'Low.52W' },
					{ name: 'Dividend Yield', value: 'dividend_yield_recent' },
					{ name: 'Beta', value: 'beta_1_year' },
					{ name: 'RSI', value: 'RSI' },
					{ name: 'MACD', value: 'MACD.macd' },
				],
				default: ['name', 'close', 'change', 'volume'],
				description: 'Columns to include in the response',
			},
			// Sort options
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['marketData', 'scanner'],
						operation: ['get', 'scan'],
					},
				},
				options: [
					{ name: 'Volume', value: 'volume' },
					{ name: 'Market Cap', value: 'market_cap_basic' },
					{ name: 'Change %', value: 'change' },
					{ name: 'Price', value: 'close' },
					{ name: 'Name', value: 'name' },
				],
				default: 'volume',
				description: 'Field to sort results by',
			},
			// Custom filters
			{
				displayName: 'Use Custom Filters',
				name: 'useCustomFilters',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['scanner'],
						operation: ['scan'],
					},
				},
				default: false,
				description: 'Whether to use custom filters for scanning',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						resource: ['scanner'],
						operation: ['scan'],
						useCustomFilters: [true],
					},
				},
				placeholder: 'Add Filter',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'filter',
						displayName: 'Filter',
						values: [
							{
								displayName: 'Field',
								name: 'left',
								type: 'string',
								default: 'market_cap_basic',
								description: 'Field to filter on',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Greater Than', value: 'greater' },
									{ name: 'Less Than', value: 'less' },
									{ name: 'Equal', value: 'equal' },
									{ name: 'Not Empty', value: 'nempty' },
									{ name: 'In Range', value: 'in_range' },
								],
								default: 'greater',
							},
							{
								displayName: 'Value',
								name: 'right',
								type: 'string',
								default: '',
								description: 'Value to compare against',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);

		// Validate session first
		const isValidSession = await validateSession.call(this);
		if (!isValidSession) {
			throw new NodeOperationError(
				this.getNode(),
				'Invalid TradingView session. Please check your credentials.',
				{ itemIndex: 0 }
			);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'marketData') {
					const operation = this.getNodeParameter('operation', i) as string;
					
					if (operation === 'get') {
						const market = this.getNodeParameter('market', i) as string;
						const limit = this.getNodeParameter('limit', i) as number;
						const columns = this.getNodeParameter('columns', i) as string[];
						const sortBy = this.getNodeParameter('sortBy', i) as string;

						const data = await getMarketData.call(this, market, [], columns, sortBy, limit);
						
						returnData.push({
							json: {
								market,
								count: data.length,
								data,
								timestamp: new Date().toISOString(),
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'getAll') {
						const overview = await getMarketOverview.call(this);
						
						returnData.push({
							json: {
								...overview,
								operation: 'getAllMarkets',
								timestamp: new Date().toISOString(),
							},
							pairedItem: { item: i },
						});
					}
				} else if (resource === 'scanner') {
					const operation = this.getNodeParameter('operation', i) as string;
					const market = this.getNodeParameter('market', i) as string;
					const limit = this.getNodeParameter('limit', i) as number;
					const columns = this.getNodeParameter('columns', i) as string[];

					let filters: IDataObject[] = [];
					let sortBy = 'volume';

					if (operation === 'scan') {
						const useCustomFilters = this.getNodeParameter('useCustomFilters', i) as boolean;
						sortBy = this.getNodeParameter('sortBy', i) as string;

						if (useCustomFilters) {
							const filterData = this.getNodeParameter('filters', i) as IDataObject;
							if (filterData.filter) {
								filters = filterData.filter as IDataObject[];
							}
						} else {
							filters = [{ left: 'market_cap_basic', operation: 'nempty' }];
						}
					} else if (operation === 'gainers') {
						filters = [
							{ left: 'change', operation: 'greater', right: 0 },
							{ left: 'volume', operation: 'greater', right: 100000 },
						];
						sortBy = 'change';
					} else if (operation === 'losers') {
						filters = [
							{ left: 'change', operation: 'less', right: 0 },
							{ left: 'volume', operation: 'greater', right: 100000 },
						];
						sortBy = 'change';
					} else if (operation === 'active') {
						filters = [{ left: 'volume', operation: 'nempty' }];
						sortBy = 'volume';
					}

					const data = await getMarketData.call(this, market, filters, columns, sortBy, limit);
					
					returnData.push({
						json: {
							operation,
							market,
							count: data.length,
							data,
							timestamp: new Date().toISOString(),
						},
						pairedItem: { item: i },
					});
				} else if (resource === 'overview') {
					const overview = await getMarketOverview.call(this);
					
					returnData.push({
						json: {
							...overview,
							operation: 'overview',
							timestamp: new Date().toISOString(),
						},
						pairedItem: { item: i },
					});
				} else if (resource === 'validation') {
					const isValid = await validateSession.call(this);
					
					returnData.push({
						json: {
							sessionValid: isValid,
							timestamp: new Date().toISOString(),
							message: isValid 
								? 'Session is valid and working properly' 
								: 'Session is invalid or expired',
						},
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							timestamp: new Date().toISOString(),
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}