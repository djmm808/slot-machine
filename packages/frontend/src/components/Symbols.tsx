import React from 'react';

// Individual Symbol Components as PNG images

export const SaphireSymbol = () => (
  <img src="/saphire2.png" alt="Sapphire" width="80" height="80" />
);

export const RubySymbol = () => (
  <img src="/ruby2.png" alt="Ruby" width="80" height="80" />
);

export const EmeraldSymbol = () => (
  <img src="/emerald2.png" alt="Emerald" width="80" height="80" />
);

export const TopazSymbol = () => (
  <img src="/topaz2.png" alt="Topaz" width="80" height="80" />
);

export const QuartzSymbol = () => (
  <img src="/quartz2.png" alt="Quartz" width="80" height="80" />
);

export const PearlSymbol = () => (
  <img src="/pearl2.png" alt="Pearl" width="80" height="80" />
);

// Multiplier Symbols

export const Multiplier2x = () => (
  <img src="/2x2.png" alt="2x" width="80" height="80" />
);

export const Multiplier5x = () => (
  <img src="/5x2.png" alt="5x" width="80" height="80" />
);

export const Multiplier10x = () => (
  <img src="/10x2.png" alt="10x" width="80" height="80" />
);

export const Multiplier50x = () => (
  <img src="/10x2.png" alt="50x" width="80" height="80" />
);

export const ScatterSymbol = () => (
  <img src="/scatter2.png" alt="Scatter" width="80" height="80" />
);

// Symbol mapping component
interface SymbolAssetProps {
  symbolId: number;
  className?: string;
}

export const SymbolAsset: React.FC<SymbolAssetProps> = ({ symbolId, className }) => {
  const symbolMap: { [key: number]: React.FC } = {
    0: SaphireSymbol,
    1: RubySymbol,
    2: EmeraldSymbol,
    3: TopazSymbol,
    4: QuartzSymbol,
    5: PearlSymbol,
    100: Multiplier2x,
    101: Multiplier5x,
    102: Multiplier10x,
    103: Multiplier50x,
    200: ScatterSymbol,
  };

  const SymbolComponent = symbolMap[symbolId];

  if (!SymbolComponent) {
    return <div className={className}>?</div>;
  }

  return (
    <div className={`symbol-asset ${className || ''}`}>
      <SymbolComponent />
    </div>
  );
};
