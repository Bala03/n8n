import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TradingViewApi implements ICredentialType {
	name = 'tradingViewApi';

	displayName = 'TradingView API';

	documentationUrl = 'tradingview';

	properties: INodeProperties[] = [
		{
			displayName: 'Session ID',
			name: 'sessionId',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your TradingView session ID for authentication',
			required: true,
		},
		{
			displayName: 'Signature',
			name: 'signature',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your TradingView signature for authentication',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			description: 'Your TradingView username',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://scanner.tradingview.com',
			description: 'The base URL for TradingView API endpoints',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Content-Type': 'application/json',
				'Cookie': '=sessionid={{$credentials?.sessionId}}; signature={{$credentials?.signature}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.baseUrl}}',
			url: '/america/scan',
			method: 'POST',
			body: {
				filter: [{ left: 'market_cap_basic', operation: 'nempty' }],
				options: { lang: 'en' },
				symbols: { query: { types: [] }, tickers: [] },
				columns: ['logoid', 'name', 'close', 'change', 'change_abs', 'volume'],
				sort: { sortBy: 'Value.Traded', sortOrder: 'desc' },
				range: [0, 10],
			},
		},
	};
}