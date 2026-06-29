import React from 'react';

interface MetricCardProps {
    title: string;
    value: React.ReactNode;
    icon: string;
    iconColor?: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    onClick?: () => void;
    variant?: 'default' | 'horizontal' | 'vertical-tall' | 'mini';
}

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    icon,
    iconColor = "text-exec-blue",
    change,
    changeType = 'neutral',
    onClick,
    variant = 'default'
}) => {
    // Determine layout based on variant
    const isHorizontal = variant === 'horizontal';
    const isVerticalTall = variant === 'vertical-tall';
    const isMini = variant === 'mini';

    const barColor = iconColor.replace('text-', 'bg-');
    const hoverBorderColor = iconColor.replace('text-', 'hover:border-').replace('500', '500/50');

    return (
        <div
            className={`exec-card group relative rounded-sm p-3 flex transition-all cursor-pointer bg-[#0A0A0A] ${hoverBorderColor}
                ${isVerticalTall ? 'flex-col justify-between h-44 sm:h-32' : 'flex-col justify-between h-20 sm:h-26'}
                ${isHorizontal ? 'flex-row items-center !justify-start gap-4' : ''}
                ${isMini ? 'p-2' : 'sm:p-3.5'}
                overflow-hidden
            `}
            onClick={onClick}
        >
            {/* Animated Bottom Bar */}
            <div className={`absolute bottom-0 left-0 h-[2px] w-0 ${barColor} group-hover:w-full transition-all duration-500 opacity-60`} />
            {/* Horizontal Layout (Concept Style) */}
            {isHorizontal ? (
                <>
                    <div className="flex-shrink-0">
                        <span className={`material-symbols-outlined notranslate text-base sm:text-xl ${iconColor} bg-white/5 p-1.5 rounded-sm`} translate="no">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[8px] sm:text-xs font-semibold uppercase text-gray-400 tracking-wider truncate mb-0.5">{title}</h3>
                        <div className="text-sm sm:text-3xl font-light text-white leading-none truncate">{value}</div>
                    </div>
                </>
            ) : isVerticalTall ? (
                /* Vertical Tall Layout (Concept Style for Pendientes) */
                <>
                    <div className="flex justify-between items-start">
                        <h3 className="text-[9px] sm:text-xs font-semibold uppercase text-gray-400 tracking-wider truncate mr-1">{title}</h3>
                        <span className={`material-symbols-outlined notranslate text-base sm:text-xl ${iconColor}`} translate="no">{icon}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center flex-1">
                        <div className="text-4xl sm:text-3xl font-light text-white leading-none">{value}</div>
                        {change && (
                            <div className="flex items-center gap-1 text-[9px] mt-2 text-green-500">
                                <span className="material-symbols-outlined notranslate text-[10px]" translate="no">arrow_upward</span>
                                {change}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Default / Mini Layout */
                <>
                    <div className="flex justify-between items-start">
                        <h3 className="text-[9px] sm:text-xs font-semibold uppercase text-gray-400 tracking-wider truncate mr-1">{title}</h3>
                        <span className={`material-symbols-outlined notranslate text-base sm:text-xl ${iconColor}`} translate="no">{icon}</span>
                    </div>
                    <div>
                        <div className={`${isMini ? 'text-lg' : 'text-xl'} sm:text-3xl font-light text-white leading-none text-center`}>{value}</div>
                        {change && !isMini && (
                            <div className={`flex items-center gap-1 text-xs mt-1 ${changeType === 'positive' ? 'text-green-500' : changeType === 'negative' ? 'text-red-500' : 'text-gray-500'}`}>
                                <span className="material-symbols-outlined notranslate text-xs" translate="no">
                                    {changeType === 'positive' ? 'trending_up' : changeType === 'negative' ? 'trending_down' : 'trending_flat'}
                                </span>
                                {change}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
