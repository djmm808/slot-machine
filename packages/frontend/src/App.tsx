import React, { useRef, useState, useEffect } from 'react';
import GameHeader from './components/GameHeader';
import GameLogo from './components/GameLogo';
import SlotMachine, { SlotMachineRef } from './components/SlotMachine';
import CosmicBackground from './components/CosmicBackground';

const App: React.FC = () => {
  const slotMachineRef = useRef<SlotMachineRef>(null);
  const [freeSpinsActive, setFreeSpinsActive] = useState(false);

  const handleDemoScatter = () => {
    if (slotMachineRef.current) {
      slotMachineRef.current.triggerDemoScatter();
    }
  };

  // Add/remove class on body when free spins state changes
  useEffect(() => {
    if (freeSpinsActive) {
      document.body.classList.add('free-spins-active');
    } else {
      document.body.classList.remove('free-spins-active');
    }
  }, [freeSpinsActive]);

  return (
    <div className="App">
      <CosmicBackground />
      <GameHeader onDemoScatter={handleDemoScatter} />
      <GameLogo />
      <SlotMachine ref={slotMachineRef} onFreeSpinsChange={setFreeSpinsActive} />
    </div>
  );
};

export default App;