-- Cost of Carry Database Schema
-- This script creates the initial tables for storing market data

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Market data table for storing tick data
CREATE TABLE IF NOT EXISTS market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrument_token VARCHAR(50) NOT NULL,
    trading_symbol VARCHAR(100) NOT NULL,
    exchange VARCHAR(20) NOT NULL,
    segment VARCHAR(50) NOT NULL,
    instrument_type VARCHAR(20) NOT NULL, -- SPOT, FUTURE, OPTION
    strike_price DECIMAL(10,2),
    option_type VARCHAR(2), -- CE, PE
    expiry_date DATE,
    
    -- Price data
    open_price DECIMAL(12,4),
    high_price DECIMAL(12,4),
    low_price DECIMAL(12,4),
    close_price DECIMAL(12,4),
    last_traded_price DECIMAL(12,4),
    
    -- Volume and OI
    volume BIGINT DEFAULT 0,
    open_interest BIGINT DEFAULT 0,
    
    -- Bid/Ask
    bid_price DECIMAL(12,4),
    ask_price DECIMAL(12,4),
    bid_quantity BIGINT DEFAULT 0,
    ask_quantity BIGINT DEFAULT 0,
    
    -- Timestamps
    exchange_timestamp BIGINT,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Computed data table for cost of carry calculations
CREATE TABLE IF NOT EXISTS computed_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Spot data
    spot_price DECIMAL(12,4) NOT NULL,
    
    -- ATM Strike info
    atm_strike DECIMAL(10,2) NOT NULL,
    
    -- Weekly options data
    weekly_call_price DECIMAL(12,4),
    weekly_put_price DECIMAL(12,4),
    weekly_call_iv DECIMAL(8,4),
    weekly_put_iv DECIMAL(8,4),
    weekly_expiry DATE,
    
    -- Monthly options data  
    monthly_call_price DECIMAL(12,4),
    monthly_put_price DECIMAL(12,4),
    monthly_call_iv DECIMAL(8,4),
    monthly_put_iv DECIMAL(8,4),
    monthly_expiry DATE,
    
    -- Synthetic calculations
    weekly_synthetic_future DECIMAL(12,4),
    monthly_synthetic_future DECIMAL(12,4),
    
    -- Cost of carry
    weekly_cost_of_carry DECIMAL(8,4),
    monthly_cost_of_carry DECIMAL(8,4),
    calendar_spread DECIMAL(8,4),
    
    -- Premium analysis
    weekly_call_premium DECIMAL(8,4),
    weekly_put_premium DECIMAL(8,4),
    monthly_call_premium DECIMAL(8,4),
    monthly_put_premium DECIMAL(8,4),
    
    -- Timestamps
    calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    market_timestamp BIGINT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Instrument master table
CREATE TABLE IF NOT EXISTS instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrument_token VARCHAR(50) UNIQUE NOT NULL,
    trading_symbol VARCHAR(100) NOT NULL,
    name VARCHAR(200),
    exchange VARCHAR(20) NOT NULL,
    segment VARCHAR(50) NOT NULL,
    instrument_type VARCHAR(20) NOT NULL,
    
    -- Option specific
    strike_price DECIMAL(10,2),
    option_type VARCHAR(2),
    expiry_date DATE,
    
    -- Metadata
    lot_size INTEGER DEFAULT 1,
    tick_size DECIMAL(8,4) DEFAULT 0.05,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Strike changes log
CREATE TABLE IF NOT EXISTS strike_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    old_strike DECIMAL(10,2),
    new_strike DECIMAL(10,2) NOT NULL,
    spot_price DECIMAL(12,4) NOT NULL,
    change_reason VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expiry changes log
CREATE TABLE IF NOT EXISTS expiry_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expiry_type VARCHAR(20) NOT NULL, -- WEEKLY, MONTHLY
    old_expiry DATE,
    new_expiry DATE NOT NULL,
    change_reason VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data fetch logs
CREATE TABLE IF NOT EXISTS data_fetch_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange VARCHAR(20) NOT NULL,
    trading_symbol VARCHAR(100) NOT NULL,
    fetch_date DATE NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    records_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'SUCCESS', -- SUCCESS, FAILED, PARTIAL
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(trading_symbol, server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_exchange_timestamp ON market_data(exchange, server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_instrument_token ON market_data(instrument_token);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(server_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_computed_data_timestamp ON computed_data(calculation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_computed_data_atm_strike ON computed_data(atm_strike);

CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON instruments(trading_symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_token ON instruments(instrument_token);
CREATE INDEX IF NOT EXISTS idx_instruments_exchange ON instruments(exchange);
CREATE INDEX IF NOT EXISTS idx_instruments_expiry ON instruments(expiry_date);

CREATE INDEX IF NOT EXISTS idx_strike_changes_timestamp ON strike_changes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_expiry_changes_timestamp ON expiry_changes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_data_fetch_logs_date ON data_fetch_logs(fetch_date DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_market_data_updated_at BEFORE UPDATE ON market_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instruments_updated_at BEFORE UPDATE ON instruments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample instrument data for NIFTY
INSERT INTO instruments (instrument_token, trading_symbol, name, exchange, segment, instrument_type, lot_size, tick_size) VALUES
('256265', 'NIFTY 50', 'NIFTY 50', 'NSE', 'INDICES', 'INDEX', 50, 0.05),
('260105', 'NIFTY BANK', 'NIFTY BANK', 'NSE', 'INDICES', 'INDEX', 25, 0.05)
ON CONFLICT (instrument_token) DO NOTHING;

-- Create a view for latest market data
CREATE OR REPLACE VIEW latest_market_data AS
SELECT DISTINCT ON (trading_symbol) 
    *
FROM market_data 
ORDER BY trading_symbol, server_timestamp DESC;

-- Create a view for current computed data
CREATE OR REPLACE VIEW current_computed_data AS
SELECT * FROM computed_data 
ORDER BY calculation_timestamp DESC 
LIMIT 1;

COMMENT ON TABLE market_data IS 'Stores real-time and historical market data from Zerodha API';
COMMENT ON TABLE computed_data IS 'Stores calculated cost of carry and synthetic future values';
COMMENT ON TABLE instruments IS 'Master table for all tradeable instruments';
COMMENT ON TABLE strike_changes IS 'Log of ATM strike changes';
COMMENT ON TABLE expiry_changes IS 'Log of expiry date changes';
COMMENT ON TABLE data_fetch_logs IS 'Log of data fetching operations from Zerodha API';