import React from 'react';

export const PrintButton: React.FC = () => {
  return <button onClick={() => window.print()}>Imprimir</button>;
};
