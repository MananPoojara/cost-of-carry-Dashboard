/**
 * Market Status Header - Horizontal Key Metrics Bar
 */

import React from 'react';

interface MarketStatusHeaderProps {
    connectionStatus?: string;
    atmStrike?: number;
    expiries?: {
        weekly?: string;
        monthly?: string;
    };
    spreadZScore?: {
        zScore: number;
        interpretation: string;
        extremeLevel: string;
    };
    lastUpdate?: string | null;
}

const MarketStatusHeader: React.FC<MarketStatusHeaderProps> = ({
    atmStrike,
    spreadZScore,
}) => {
    return (
        <div className="bg-[#161B22] border border-[#1E2733] rounded-xl p-5 mb-5">
            <div className="grid grid-cols-4 gap-6">
                {/* Index Spot */}
                <div>
                    <div className="text-[11px] font-medium text-[#6E7681] uppercase tracking-wide mb-2">Index Spot</div>
                    <div className="text-2xl font-semibold text-[#C9D1D9] font-mono">
                        {atmStrike ? atmStrike.toLocaleString() : '25,707'}
                    </div>
                    <div className="text-xs font-medium text-[#26A641] mt-1">+0.15%</div>
                </div>

                {/* Synthetic */}
                <div>
                    <div className="text-[11px] font-medium text-[#6E7681] uppercase tracking-wide mb-2">Synthetic</div>
                    <div className="text-2xl font-semibold text-[#C9D1D9] font-mono">
                        {atmStrike ? (atmStrike + 15.75).toLocaleString() : '25,723'}
                    </div>
                    <div className="text-xs font-medium text-[#26A641] mt-1">+15.75</div>
                </div>

                {/* Spread */}
                <div>
                    <div className="text-[11px] font-medium text-[#6E7681] uppercase tracking-wide mb-2">Spread</div>
                    <div className="text-2xl font-semibold text-[#C9D1D9] font-mono">
                        +15.75
                    </div>
                    <div className="text-xs font-medium text-[#8B949E] mt-1">Basis Points</div>
                </div>

                {/* Z-Score */}
                <div>
                    <div className="text-[11px] font-medium text-[#6E7681] uppercase tracking-wide mb-2">Z-Score</div>
                    <div className={`text-2xl font-semibold font-mono ${
                        !spreadZScore ? 'text-[#8B949E]' :
                        Math.abs(spreadZScore.zScore) > 2 ? 'text-[#F85149]' :
                        Math.abs(spreadZScore.zScore) > 1 ? 'text-[#FFA657]' : 'text-[#26A641]'
                    }`}>
                        {spreadZScore ? spreadZScore.zScore.toFixed(2) : '0.48'}
                    </div>
                    <div className="text-xs font-medium text-[#8B949E] mt-1">
                        {spreadZScore?.interpretation || 'Normal'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketStatusHeader;