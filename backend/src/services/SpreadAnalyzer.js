/**
 * Spread Analyzer - Pro-Level Feature
 * Calculates Z-Score for spreads to show how extreme current values are
 * Provides institutional-grade analytics that traders love
 */

class SpreadAnalyzer {
    constructor() {
        this.spreadHistory = []; // Keep recent spread history
        this.maxHistory = 100; // Keep last 100 spreads
        this.minDataPoints = 10; // Minimum data points for reliable Z-Score
    }

    /**
     * Calculate Z-Score for current spread
     * Z-Score shows how many standard deviations away from mean
     * @param {number} currentSpread - Current spread value
     * @returns {Object} Z-Score analysis with interpretation
     */
    calculateZScore(currentSpread) {
        // Add current spread to history
        this.spreadHistory.push({
            value: currentSpread,
            timestamp: new Date()
        });

        // Keep only recent history for performance
        if (this.spreadHistory.length > this.maxHistory) {
            this.spreadHistory.shift();
        }

        // Need minimum data points for reliable calculation
        if (this.spreadHistory.length < this.minDataPoints) {
            return {
                zScore: 0,
                interpretation: 'INSUFFICIENT_DATA',
                extremeLevel: 'NORMAL',
                dataPoints: this.spreadHistory.length,
                minRequired: this.minDataPoints
            };
        }

        const values = this.spreadHistory.map(item => item.value);
        const mean = this.calculateMean(values);
        const stdDev = this.calculateStdDev(values, mean);

        // Handle edge case where standard deviation is zero
        if (stdDev === 0) {
            return {
                zScore: 0,
                interpretation: 'NO_VOLATILITY',
                extremeLevel: 'NORMAL',
                mean: mean,
                stdDev: stdDev,
                dataPoints: values.length
            };
        }

        const zScore = (currentSpread - mean) / stdDev;

        return {
            zScore: zScore,
            mean: mean,
            stdDev: stdDev,
            interpretation: this.interpretZScore(zScore),
            extremeLevel: this.getExtremeLevel(zScore),
            dataPoints: values.length,
            currentValue: currentSpread,
            percentile: this.calculatePercentile(currentSpread, values),
            confidence: this.getConfidenceLevel(values.length)
        };
    }

    /**
     * Calculate mean (average) of values
     * @param {Array} values - Array of numeric values
     * @returns {number} Mean value
     */
    calculateMean(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Calculate standard deviation
     * @param {Array} values - Array of numeric values
     * @param {number} mean - Pre-calculated mean
     * @returns {number} Standard deviation
     */
    calculateStdDev(values, mean) {
        if (values.length === 0) return 0;

        const variance = values.reduce((sum, val) => {
            return sum + Math.pow(val - mean, 2);
        }, 0) / values.length;

        return Math.sqrt(variance);
    }

    /**
     * Interpret Z-Score with trading-relevant descriptions
     * @param {number} zScore - Calculated Z-Score
     * @returns {string} Human-readable interpretation
     */
    interpretZScore(zScore) {
        const absZScore = Math.abs(zScore);

        if (absZScore > 3) {
            return zScore > 0 ? 'EXTREMELY_HIGH' : 'EXTREMELY_LOW';
        } else if (absZScore > 2) {
            return zScore > 0 ? 'VERY_HIGH' : 'VERY_LOW';
        } else if (absZScore > 1.5) {
            return zScore > 0 ? 'HIGH' : 'LOW';
        } else if (absZScore > 1) {
            return zScore > 0 ? 'MODERATELY_HIGH' : 'MODERATELY_LOW';
        } else {
            return 'NORMAL';
        }
    }

    /**
     * Get extreme level classification
     * @param {number} zScore - Calculated Z-Score
     * @returns {string} Extreme level classification
     */
    getExtremeLevel(zScore) {
        const absZScore = Math.abs(zScore);

        if (absZScore > 2.5) return 'EXTREME';
        if (absZScore > 2) return 'VERY_UNUSUAL';
        if (absZScore > 1.5) return 'UNUSUAL';
        if (absZScore > 1) return 'NOTABLE';
        return 'NORMAL';
    }

    /**
     * Calculate percentile rank of current value
     * @param {number} currentValue - Current spread value
     * @param {Array} values - Historical values
     * @returns {number} Percentile (0-100)
     */
    calculatePercentile(currentValue, values) {
        const sortedValues = [...values].sort((a, b) => a - b);
        const rank = sortedValues.filter(val => val <= currentValue).length;
        return Math.round((rank / sortedValues.length) * 100);
    }

    /**
     * Get confidence level based on sample size
     * @param {number} sampleSize - Number of data points
     * @returns {string} Confidence level
     */
    getConfidenceLevel(sampleSize) {
        if (sampleSize >= 50) return 'HIGH';
        if (sampleSize >= 30) return 'MEDIUM';
        if (sampleSize >= 20) return 'FAIR';
        return 'LOW';
    }

    /**
     * Get trading signal based on Z-Score
     * @param {number} zScore - Calculated Z-Score
     * @returns {Object} Trading signal information
     */
    getTradingSignal(zScore) {
        const absZScore = Math.abs(zScore);

        if (absZScore > 2) {
            return {
                signal: zScore > 0 ? 'MEAN_REVERSION_SELL' : 'MEAN_REVERSION_BUY',
                strength: 'STRONG',
                description: `Spread is ${absZScore.toFixed(1)} standard deviations from mean - extreme value`,
                riskLevel: 'HIGH'
            };
        } else if (absZScore > 1.5) {
            return {
                signal: zScore > 0 ? 'WEAK_SELL' : 'WEAK_BUY',
                strength: 'MODERATE',
                description: `Spread is ${absZScore.toFixed(1)} standard deviations from mean - notable deviation`,
                riskLevel: 'MEDIUM'
            };
        } else {
            return {
                signal: 'NEUTRAL',
                strength: 'NONE',
                description: 'Spread is within normal range',
                riskLevel: 'LOW'
            };
        }
    }

    /**
     * Get historical statistics
     * @returns {Object} Historical statistics
     */
    getHistoricalStats() {
        if (this.spreadHistory.length === 0) {
            return {
                count: 0,
                mean: 0,
                stdDev: 0,
                min: 0,
                max: 0,
                range: 0
            };
        }

        const values = this.spreadHistory.map(item => item.value);
        const mean = this.calculateMean(values);
        const stdDev = this.calculateStdDev(values, mean);
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            count: values.length,
            mean: mean,
            stdDev: stdDev,
            min: min,
            max: max,
            range: max - min,
            firstValue: values[0],
            lastValue: values[values.length - 1],
            trend: this.calculateTrend(values)
        };
    }

    /**
     * Calculate trend direction
     * @param {Array} values - Array of values
     * @returns {string} Trend direction
     */
    calculateTrend(values) {
        if (values.length < 5) return 'INSUFFICIENT_DATA';

        const recent = values.slice(-5);
        const older = values.slice(-10, -5);

        if (older.length === 0) return 'INSUFFICIENT_DATA';

        const recentMean = this.calculateMean(recent);
        const olderMean = this.calculateMean(older);

        const difference = recentMean - olderMean;
        const threshold = this.calculateStdDev(values, this.calculateMean(values)) * 0.1;

        if (Math.abs(difference) < threshold) return 'SIDEWAYS';
        return difference > 0 ? 'UPTREND' : 'DOWNTREND';
    }

    /**
     * Reset history (useful for new trading sessions)
     */
    resetHistory() {
        this.spreadHistory = [];
        console.log('📊 Spread history reset');
    }

    /**
     * Get current analysis summary
     * @returns {Object} Current analysis summary
     */
    getCurrentAnalysis() {
        if (this.spreadHistory.length === 0) {
            return {
                status: 'NO_DATA',
                message: 'No spread data available for analysis'
            };
        }

        const latestSpread = this.spreadHistory[this.spreadHistory.length - 1];
        const zScoreAnalysis = this.calculateZScore(latestSpread.value);
        const tradingSignal = this.getTradingSignal(zScoreAnalysis.zScore);
        const historicalStats = this.getHistoricalStats();

        return {
            status: 'ACTIVE',
            currentSpread: latestSpread.value,
            zScore: zScoreAnalysis,
            tradingSignal: tradingSignal,
            historicalStats: historicalStats,
            lastUpdate: latestSpread.timestamp
        };
    }

    /**
     * Export historical data for analysis
     * @returns {Array} Historical spread data
     */
    exportHistoricalData() {
        return this.spreadHistory.map(item => ({
            timestamp: item.timestamp.toISOString(),
            value: item.value,
            zScore: this.calculateZScore(item.value).zScore
        }));
    }
}

module.exports = SpreadAnalyzer;