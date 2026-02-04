# Charts and Calculations Reference

## 1. Spot vs Synthetic Chart
- **Original Name**: SpotVsSyntheticChart
- **Business Purpose**: Compares actual spot prices with synthetic futures prices to identify arbitrage opportunities
- **Calculation Formula**: 
  - Synthetic Price = Spot Price + (Spot Price × Cost of Carry × Time to Expiry)
  - Where Cost of Carry = Risk-Free Rate - Dividend Yield
- **Input Data Sources**: 
  - Spot price from market data feed
  - Weekly synthetic price calculated from futures contracts
  - Historical data stored in database

## 2. Cost of Carry Chart
- **Original Name**: CostOfCarryChart
- **Business Purpose**: Shows the cost of holding a position over time, indicating market sentiment and pricing inefficiencies
- **Calculation Formula**:
  - Weekly Cost of Carry = (Weekly Futures Price - Spot Price) / Spot Price * (365 / Days to Expiry) * 100
  - Monthly Cost of Carry = (Monthly Futures Price - Spot Price) / Spot Price * (365 / Days to Expiry) * 100
- **Input Data Sources**:
  - Spot price from market data
  - Weekly and monthly futures prices
  - Expiry dates for contracts

## 3. Calendar Spread Chart
- **Original Name**: CalendarSpreadChart
- **Business Purpose**: Displays the price difference between near-term and far-term futures contracts
- **Calculation Formula**:
  - Calendar Spread = Far-term Futures Price - Near-term Futures Price
  - Or expressed as percentage: (Far-term - Near-term) / Spot Price * 100
- **Input Data Sources**:
  - Near-term futures contract price
  - Far-term futures contract price
  - Spot price for normalization

## 4. Premium Analysis Chart
- **Original Name**: PremiumAnalysisChart
- **Business Purpose**: Analyzes statistical deviations in spreads using Z-score methodology
- **Calculation Formula**:
  - Z-Score = (Current Spread - Mean Spread) / Standard Deviation of Spreads
  - Mean and Std Dev calculated over rolling window (typically 20-30 days)
- **Input Data Sources**:
  - Historical spread values
  - Current spread value
  - Rolling window period for statistics

## 5. Additional Metrics
- **ATM Strike**: At-the-money strike price for options
- **Spread Z-Score**: Statistical measure of how unusual the current spread is
- **Market Feed Logs**: Real-time data updates showing price movements
- **System Statistics**: Latency, CPU usage, and connection status



│                                                                                         │
│  Run regularly:                                                                         │
│  openclaw security audit --deep                                                         │
│  openclaw security audit --fix 