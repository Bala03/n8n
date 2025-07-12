# TradingView Node for n8n

## Overview

The TradingView node is a robust integration for n8n that provides comprehensive access to TradingView's market data API. This node is designed with enhanced error handling, global session management, and retry mechanisms to ensure reliable data fetching without errors.

## Key Features

### 🛡️ Robust Error Handling
- **Automatic Retry Logic**: Implements exponential backoff for failed requests
- **Rate Limit Management**: Automatically handles rate limiting with intelligent delays
- **Session Validation**: Validates credentials before making API calls
- **Comprehensive Error Messages**: Provides clear, actionable error messages

### 🌐 Global Session Management
- **Session ID & Signature**: Manages authentication globally across all operations
- **Credential Persistence**: Reuses authentication across multiple API calls
- **Session Validation**: Built-in session health checking

### 📊 Comprehensive Data Access
- **Multiple Markets**: Supports America, Europe, Asia, Australia, Canada, and India markets
- **Various Operations**: Market data, stock scanning, overview, and validation
- **Flexible Filtering**: Custom filters for advanced stock screening
- **Pagination Support**: Handles large datasets with automatic pagination

## Configuration

### Credentials Setup

1. **Session ID**: Your TradingView session ID
   - Found in browser cookies after logging into TradingView
   - Required for authentication

2. **Signature**: Your TradingView signature
   - Found in browser cookies alongside session ID
   - Used for request validation

3. **Username**: Your TradingView username
   - Used for session identification

4. **Base URL**: TradingView API endpoint
   - Default: `https://scanner.tradingview.com`
   - Usually doesn't need to be changed

### How to Get Session Credentials

1. Log into TradingView in your browser
2. Open Developer Tools (F12)
3. Go to Application/Storage tab → Cookies
4. Find `sessionid` and `signature` values
5. Copy these values to the node credentials

## Operations

### Market Data
- **Get Market Data**: Fetch data from a specific market
- **Get All Markets Data**: Comprehensive data from all supported markets

### Stock Scanner  
- **Scan Stocks**: Custom stock screening with filters
- **Get Top Gainers**: Stocks with highest positive change
- **Get Top Losers**: Stocks with highest negative change  
- **Get Most Active**: Most actively traded stocks

### Market Overview
- **Get Overview**: Comprehensive overview of all markets

### Session Validation
- **Validate Session**: Check if credentials are valid and working

## Examples

### Basic Market Data Fetch
```json
{
  "resource": "marketData",
  "operation": "get", 
  "market": "america",
  "limit": 50,
  "columns": ["name", "close", "change", "volume"],
  "sortBy": "volume"
}
```

### Top Gainers Scanner
```json
{
  "resource": "scanner",
  "operation": "gainers",
  "market": "america", 
  "limit": 25,
  "columns": ["name", "close", "change", "volume"]
}
```

### Custom Stock Scanner
```json
{
  "resource": "scanner",
  "operation": "scan",
  "market": "america",
  "useCustomFilters": true,
  "filters": {
    "filter": [
      {
        "left": "market_cap_basic",
        "operation": "greater", 
        "right": "1000000000"
      },
      {
        "left": "volume",
        "operation": "greater",
        "right": "100000"
      }
    ]
  }
}
```

## Available Columns

- `name`: Company name
- `logoid`: Company logo identifier  
- `close`: Current/closing price
- `change`: Percentage change
- `change_abs`: Absolute price change
- `volume`: Trading volume
- `market_cap_basic`: Market capitalization
- `price_earnings_ttm`: P/E ratio (trailing twelve months)
- `earnings_per_share_basic_ttm`: Earnings per share
- `High.52W`: 52-week high
- `Low.52W`: 52-week low
- `dividend_yield_recent`: Dividend yield
- `beta_1_year`: Beta coefficient
- `RSI`: Relative Strength Index
- `MACD.macd`: MACD indicator

## Filter Operations

- `greater`: Greater than
- `less`: Less than  
- `equal`: Equal to
- `nempty`: Not empty
- `in_range`: Within range

## Error Handling Features

### Automatic Retries
- Failed requests are automatically retried up to 3 times
- Exponential backoff prevents overwhelming the API
- Rate limit errors trigger intelligent delays

### Session Management
- Automatic session validation before operations
- Clear error messages for expired sessions
- Guidance on credential renewal

### Robust API Handling
- Handles various response formats (JSON, text)
- Graceful degradation for partial failures
- Comprehensive logging for debugging

## Best Practices

1. **Credential Management**
   - Regularly update session credentials (they expire)
   - Use environment variables for credentials in production
   - Monitor for authentication errors

2. **Rate Limiting**
   - Use reasonable limits (< 1000 items per request)
   - Add delays between multiple node executions
   - Monitor API usage to avoid limits

3. **Error Handling**
   - Enable "Continue on Fail" for batch operations
   - Implement retry logic in workflows
   - Log errors for monitoring

4. **Data Management**
   - Use pagination for large datasets
   - Cache frequently accessed data
   - Filter data at the API level when possible

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check if session credentials are current
   - Verify username matches the session
   - Re-extract credentials from browser

2. **Rate Limiting**
   - Reduce request frequency
   - Implement delays between requests
   - Use smaller batch sizes

3. **Empty Results**
   - Verify market parameter is correct
   - Check filter criteria aren't too restrictive
   - Ensure market is open/has data

### Debug Tips

- Use the "Session Validation" operation to test credentials
- Start with small limits to test connectivity
- Check the node's output for error details
- Monitor network requests in browser dev tools

## Security Notes

- Session credentials provide full access to your TradingView account
- Store credentials securely and rotate regularly
- Don't share credentials or workflows containing them
- Use n8n's credential encryption features

## Limitations

- Requires active TradingView account with valid session
- Subject to TradingView's rate limits and terms of service
- Some advanced features may require TradingView Pro subscription
- Real-time data availability depends on your TradingView plan