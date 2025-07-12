import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, sleep } from 'n8n-workflow';

/**
 * Make an API request to TradingView with robust error handling
 */
export async function tradingViewApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('tradingViewApi');
	
	const options: IHttpRequestOptions = {
		method,
		body,
		qs,
		uri: uri || `${credentials.baseUrl}${endpoint}`,
		json: true,
		gzip: true,
		rejectUnauthorized: false,
		...option,
	};

	// Add global session credentials
	options.headers = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
		'Content-Type': 'application/json',
		'Accept': 'application/json',
		'Cookie': `sessionid=${credentials.sessionId}; signature=${credentials.signature}`,
		'Referer': 'https://www.tradingview.com/',
		'Origin': 'https://www.tradingview.com',
		...options.headers,
	};

	// Implement retry logic for robustness
	let retries = 3;
	let lastError: any;

	while (retries > 0) {
		try {
			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'tradingViewApi',
				options,
			);
			
			// Handle various response types
			if (typeof response === 'string') {
				try {
					return JSON.parse(response);
				} catch {
					return { data: response };
				}
			}
			
			return response;
		} catch (error) {
			lastError = error;
			retries--;

			// Handle specific TradingView errors
			if (error instanceof NodeApiError) {
				const httpCode = error.httpCode;
				
				// Handle authentication errors
				if (httpCode === 401 || httpCode === 403) {
					throw new NodeApiError(this.getNode(), error, {
						message: 'Authentication failed. Please check your session ID and signature.',
						description: 'Your TradingView credentials may have expired. Please update them.',
					});
				}
				
				// Handle rate limiting
				if (httpCode === 429) {
					if (retries > 0) {
						await sleep(2000 * (4 - retries)); // Exponential backoff
						continue;
					}
					throw new NodeApiError(this.getNode(), error, {
						message: 'Rate limit exceeded. Please try again later.',
						description: 'TradingView API rate limit has been exceeded.',
					});
				}
				
				// Handle server errors
				if (httpCode >= 500) {
					if (retries > 0) {
						await sleep(1000 * (4 - retries));
						continue;
					}
					throw new NodeApiError(this.getNode(), error, {
						message: 'TradingView server error. Please try again later.',
						description: `Server returned ${httpCode} error.`,
					});
				}
			}
			
			// If no retries left, throw the last error
			if (retries === 0) {
				throw new NodeApiError(this.getNode(), lastError as JsonObject, {
					message: 'TradingView API request failed after multiple retries.',
					description: 'Please check your network connection and TradingView credentials.',
				});
			}
			
			// Wait before retry
			await sleep(1000);
		}
	}

	throw lastError;
}

/**
 * Make API request to fetch all items with pagination
 */
export async function tradingViewApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any[]> {
	const returnData: any[] = [];
	let responseData;
	
	const originalBody = { ...body };
	let currentRange = originalBody.range || [0, 50];
	let startIndex = currentRange[0];
	const batchSize = Math.min(currentRange[1] - currentRange[0], 150); // Max 150 per request

	do {
		// Update range for current batch
		body.range = [startIndex, startIndex + batchSize];
		
		try {
			responseData = await tradingViewApiRequest.call(this, method, endpoint, body, qs);
			
			if (responseData && responseData.data) {
				returnData.push(...responseData.data);
				
				// Check if we got less data than requested (end of data)
				if (responseData.data.length < batchSize) {
					break;
				}
				
				startIndex += batchSize;
			} else {
				break;
			}
		} catch (error) {
			// Log the error but continue with what we have
			console.warn('Error fetching batch:', error.message);
			break;
		}
		
		// Rate limiting - wait between requests
		await sleep(200);
		
	} while (responseData && responseData.data && responseData.data.length > 0);

	return returnData;
}

/**
 * Get market data with error handling
 */
export async function getMarketData(
	this: IExecuteFunctions,
	market: string,
	filters: IDataObject[] = [],
	columns: string[] = [],
	sortBy?: string,
	limit: number = 50,
): Promise<any[]> {
	const body: IDataObject = {
		filter: filters.length > 0 ? filters : [{ left: 'market_cap_basic', operation: 'nempty' }],
		options: { lang: 'en' },
		symbols: { query: { types: [] }, tickers: [] },
		columns: columns.length > 0 ? columns : [
			'logoid',
			'name',
			'close',
			'change',
			'change_abs',
			'volume',
			'market_cap_basic',
			'price_earnings_ttm',
			'earnings_per_share_basic_ttm',
		],
		sort: sortBy ? { sortBy, sortOrder: 'desc' } : { sortBy: 'volume', sortOrder: 'desc' },
		range: [0, Math.min(limit, 150)],
	};

	try {
		if (limit <= 150) {
			const response = await tradingViewApiRequest.call(this, 'POST', `/${market}/scan`, body);
			return response?.data || [];
		} else {
			// Use pagination for larger requests
			return await tradingViewApiRequestAllItems.call(this, 'POST', `/${market}/scan`, body);
		}
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to fetch ${market} market data: ${error.message}`,
			{ itemIndex: 0 }
		);
	}
}

/**
 * Validate session credentials
 */
export async function validateSession(this: IExecuteFunctions): Promise<boolean> {
	try {
		await tradingViewApiRequest.call(this, 'POST', '/america/scan', {
			filter: [{ left: 'market_cap_basic', operation: 'nempty' }],
			options: { lang: 'en' },
			symbols: { query: { types: [] }, tickers: [] },
			columns: ['name'],
			sort: { sortBy: 'volume', sortOrder: 'desc' },
			range: [0, 1],
		});
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Get comprehensive market overview
 */
export async function getMarketOverview(this: IExecuteFunctions): Promise<IDataObject> {
	const markets = ['america', 'europe', 'asia'];
	const overview: IDataObject = {};

	for (const market of markets) {
		try {
			const data = await getMarketData.call(this, market, [], [], 'volume', 10);
			overview[market] = {
				topStocks: data,
				totalCount: data.length,
				market: market,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			overview[market] = {
				error: `Failed to fetch ${market} data: ${error.message}`,
				market: market,
				timestamp: new Date().toISOString(),
			};
		}
		
		// Rate limiting between market requests
		await sleep(300);
	}

	return overview;
}