import { describe, expect, it } from 'vitest';
import { createStageMachine } from '../../packages/simulation-runtime/src/core/stageMachine';

describe('simulation stage machine', () => {
  it('starts at the first stage and moves forward and backward within bounds', () => {
    const machine = createStageMachine(['intro', 'observe', 'explain']);

    expect(machine.current()).toBe('intro');
    expect(machine.currentIndex()).toBe(0);
    expect(machine.next()).toBe('observe');
    expect(machine.next()).toBe('explain');
    expect(machine.next()).toBe('explain');
    expect(machine.previous()).toBe('observe');
    expect(machine.previous()).toBe('intro');
    expect(machine.previous()).toBe('intro');
  });

  it('supports goTo and reset', () => {
    const machine = createStageMachine([{ title: 'A' }, { title: 'B' }, { title: 'C' }]);

    expect(machine.goTo(2)).toEqual({ title: 'C' });
    expect(machine.goTo(99)).toEqual({ title: 'C' });
    expect(machine.goTo(-10)).toEqual({ title: 'A' });
    expect(machine.reset()).toEqual({ title: 'A' });
  });

  it('rejects empty stage lists', () => {
    expect(() => createStageMachine([])).toThrow('at least one stage');
  });
});
