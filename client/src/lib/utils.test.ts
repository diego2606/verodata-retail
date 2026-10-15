import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('une las clases indicadas', () => {
    expect(cn('px-2', 'text-sm')).toBe('px-2 text-sm');
  });

  it('ignora valores falsy', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });

  it('resuelve conflictos de Tailwind quedándose con la última', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('devuelve cadena vacía sin argumentos', () => {
    expect(cn()).toBe('');
  });
});
