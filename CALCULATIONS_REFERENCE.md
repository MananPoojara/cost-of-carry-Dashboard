# NIFTY Synthetic Dashboard - Calculations & Chart Reference

## 📊 Dashboard Overview

This institutional-grade terminal provides **real-time synthetic pricing analysis** for NIFTY index options, calculating the "fair value" of NIFTY using **put-call parity arbitrage** relationships. Traders use this dashboard to identify **cost-of-carry anomalies**, **calendar spread opportunities**, and **extreme pricing dislocations** in the Indian derivatives market.

---

## 🧮 Core Calculations

### 1. Synthetic Future Price (Put-Call Parity)

**Formula:**
```
Synthetic Future = (Call Price - Put Price) + Strike Price
```

**Data Required:**
- ATM Call Option Price (Weekly or Monthly)
- ATM Put Option Price (Weekly or Monthly)
- ATM Strike Price (rounded to nearest 50)
- NIFTY Spot Price (for comparison)

**Purpose:**
The synthetic future represents the **theoretical forward price** of NIFTY based on option prices. In an efficient market, this should equal the spot price adjusted for the risk-free rate and dividends. Deviations indicate arbitrage opportunities.

**Trading Signal:**
- If `Synthetic > Spot`: **Contango** - futures trading at premium (bullish sentiment)
- If `Synthetic < Spot`: **Backwardation** - futures trading at discount (bearish sentiment)

---

### 2. Cost of Carry (Basis)

**Formula:**
```
Cost of Carry = Synthetic Future - Spot Price
```

**Data Required:**
- Synthetic Future Price (from calculation #1)
- NIFTY Spot Price

**Purpose:**
The "basis" measures the **premium or discount** at which the synthetic future trades relative to the spot index. In theory, this should equal the risk-free interest rate minus dividend yield over the time to expiry. Large deviations suggest **mispricing** or **carry trade opportunities**.

**Trading Application:**
- **Positive Basis (+20 points)**: Expensive futures → Sell synthetic, buy spot
- **Negative Basis (-15 points)**: Cheap futures → Buy synthetic, sell spot
- **Normal Range**: ±10 points for weekly options

---

### 3. Calendar Spread

**Formula:**
```
Calendar Spread = Monthly Synthetic - Weekly Synthetic
```

**Data Required:**
- Monthly Synthetic Future Price
- Weekly Synthetic Future Price

**Purpose:**
The calendar spread captures the **time value difference** between two expiries. It reflects the market's expectation of volatility decay and interest rate carry over the additional time period.

**Trading Strategy:**
- **Wide Spread (>50)**: Sell monthly, buy weekly (bet on convergence)
- **Narrow Spread (<20)**: Buy monthly, sell weekly (bet on expansion)
- **Mean Reversion**: Trade when Z-Score exceeds ±2σ

---

### 4. Z-Score (Statistical Deviation)

**Formula:**
```
Z-Score = (Current Spread - Mean Spread) / Standard Deviation
```

**Data Required:**
- Current Calendar Spread
- Historical Mean of Calendar Spread (rolling 60-period)
- Standard Deviation of Calendar Spread (rolling 60-period)

**Purpose:**
The Z-Score quantifies **how many standard deviations** the current spread is from its historical average. This is a **mean-reversion indicator** used to identify extreme pricing conditions.

**Interpretation:**
- `Z > +2`: **Extreme Overbought** - spread too wide (sell signal)
- `Z < -2`: **Extreme Oversold** - spread too narrow (buy signal)
- `-1 < Z < +1`: **Fair Value Range** - no trade signal

---

## 📈 Charts & Their Purpose

### Chart 1: **Spot vs Synthetic** (Top Left)
**X-Axis:** Time (HH:MM:SS)  
**Y-Axis:** Price (₹)  
**Lines:**
- Green Solid: NIFTY Spot Index
- Amber Dashed: Weekly Synthetic Future

**Purpose:**
Visual comparison of the actual NIFTY index price against the synthetic price derived from options. Divergences indicate **arbitrage opportunities** or **market inefficiencies**.

**Why We Use It:**
Traders can instantly see if the options market is pricing NIFTY higher or lower than the cash market. This is the **primary signal** for cash-futures arbitrage.

---

### Chart 2: **Cost of Carry** (Top Right)
**X-Axis:** Time (HH:MM:SS)  
**Y-Axis:** Basis Points (₹)  
**Areas:**
- Green Fill: Weekly Cost of Carry
- Blue Dashed: Monthly Cost of Carry

**Purpose:**
Tracks the **carry premium/discount** over time. The area chart emphasizes the magnitude of the basis.

**Why We Use It:**
Identifies **sustained mispricing** trends. If the basis remains positive for extended periods, it suggests structural demand for futures (e.g., hedging by institutional investors).

---

### Chart 3: **Calendar Spread** (Bottom Left)
**X-Axis:** Time (HH:MM:SS)  
**Y-Axis:** Spread Points (₹)  
**Line:** Amber Solid

**Purpose:**
Monitors the **price differential** between monthly and weekly expiries.

**Why We Use It:**
Calendar spreads are a **low-risk, market-neutral** strategy. This chart helps traders time entries and exits based on historical norms.

---

### Chart 4: **Z-Score Distribution** (Bottom Right)
**X-Axis:** Z-Score (-3 to +3)  
**Y-Axis:** Frequency (visual only)  
**Scatter:** Diamond marker at current Z-Score  
**Colors:**
- Green: Normal range (-2 < Z < +2)
- Red: Extreme range (|Z| > 2)

**Purpose:**
Statistical gauge for **mean reversion trades**. The diamond shows where the current spread stands relative to its historical distribution.

**Why We Use It:**
Quantifies **risk and opportunity**. A Z-Score of +3 is extremely rare and indicates a high-probability reversion trade.

---

## 🔄 Data Flow Architecture

```
Zerodha API (1-min candles)
    ↓
ZerodhaService.js (fetch & normalize)
    ↓
OptimizedDataStorage.js (calculate synthetics)
    ↓
PostgreSQL (store computed_data)
    ↓
WebSocket (Socket.io broadcast)
    ↓
Frontend Charts (Recharts rendering)
```

---

## 📊 Database Schema

### `computed_data` Table
| Column | Type | Description |
|--------|------|-------------|
| `spot_price` | DECIMAL | NIFTY spot index |
| `atm_strike` | DECIMAL | Current ATM strike (±50) |
| `weekly_synthetic_future` | DECIMAL | Weekly synthetic price |
| `monthly_synthetic_future` | DECIMAL | Monthly synthetic price |
| `weekly_cost_of_carry` | DECIMAL | Weekly basis |
| `monthly_cost_of_carry` | DECIMAL | Monthly basis |
| `calendar_spread` | DECIMAL | Monthly - Weekly |
| `calculation_timestamp` | TIMESTAMP | Server calculation time |

---

## 🎯 Key Trading Use Cases

1. **Arbitrage Detection**: When spot and synthetic diverge beyond transaction costs
2. **Expiry Roll Timing**: Optimize when to roll positions based on calendar spread
3. **Volatility Regime Shifts**: Extreme Z-Scores often precede vol expansion
4. **Market Maker Alpha**: Exploit inefficiencies in option pricing before they close

---

## 🚨 System Requirements

**Minimum Data Frequency:** 1-minute candles  
**Historical Lookback:** 50 periods for charts, 60 periods for Z-Score  
**Calculation Latency:** <100ms from tick to broadcast  
**Database Storage:** 1 record per second = ~28,800 rows/day

---

## 📝 Technical Notes

- **ATM Strike Selection**: Dynamically updates when spot moves ±25 points
- **Stale Data Filtering**: Ticks older than 2 minutes are discarded
- **Expiry Management**: Auto-rolls to next expiry at 3:25 PM on expiry day
- **Mock Data Mode**: Falls back to simulation if Zerodha connection fails

---

**Built for:** Professional Traders, Quantitative Analysts, Market Makers  
**Technology Stack:** Node.js, PostgreSQL, Socket.io, Next.js, Recharts  
**Update Frequency:** Real-time (1-second storage, instant broadcast)
