import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Desmonta los componentes entre pruebas para no arrastrar DOM ni listeners.
afterEach(() => {
  cleanup();
});
