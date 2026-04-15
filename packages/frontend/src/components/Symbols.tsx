import React from 'react';

// Individual Symbol Components as PNG images

export const SaphireSymbol = () => (
  <img src="/saphire.png" alt="Sapphire" width="60" height="60" />
);

export const RubySymbol = () => (
  <img src="/ruby.png" alt="Ruby" width="60" height="60" />
);

export const EmeraldSymbol = () => (
  <img src="/emerald.png" alt="Emerald" width="60" height="60" />
);

export const TopazSymbol = () => (
  <img src="/topaz.png" alt="Topaz" width="60" height="60" />
);

export const QuartzSymbol = () => (
  <img src="/quartz.png" alt="Quartz" width="60" height="60" />
);

export const PearlSymbol = () => (
  <img src="/pearl.png" alt="Pearl" width="60" height="60" />
);

// Multiplier Symbols

export const Multiplier2x = () => (
  <img src="/2x.png" alt="2x" width="60" height="60" />
);

export const Multiplier5x = () => (
  <img src="/5x.png" alt="5x" width="60" height="60" />
);

export const Multiplier10x = () => (
  <img src="/10x.png" alt="10x" width="60" height="60" />
);

export const Multiplier50x = () => (
  <img src="/10x.png" alt="50x" width="60" height="60" />
);

export const ScatterSymbol = () => (
  <img src="/scatter.png" alt="Scatter" width="80" height="80" />
);

// Symbol mapping component
interface SymbolAssetProps {
  symbolId: number;
  className?: string;
}

export const SymbolAsset: React.FC<SymbolAssetProps> = ({ symbolId, className }) => {
  const symbolMap: { [key: number]: React.FC } = {
    1: SaphireSymbol,
    2: RubySymbol,
    3: EmeraldSymbol,
    4: TopazSymbol,
    5: QuartzSymbol,
    6: PearlSymbol,
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
