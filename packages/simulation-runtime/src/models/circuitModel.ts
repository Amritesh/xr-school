export interface CircuitInput {
  voltage: number;
  resistance: number;
  closed: boolean;
}

export interface CircuitOutput extends Record<string, number> {
  current: number;
  power: number;
  brightness: number;
}

const REFERENCE_VOLTAGE = 9;
const REFERENCE_RESISTANCE = 10;
const REFERENCE_CURRENT = REFERENCE_VOLTAGE / REFERENCE_RESISTANCE;

function requireFinite(label: string, value: number) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function rounded(value: number) {
  return Number(value.toFixed(12));
}

export function evaluateCircuit(input: CircuitInput): CircuitOutput {
  requireFinite('voltage', input.voltage);
  requireFinite('resistance', input.resistance);
  if (input.voltage < 0) throw new Error('voltage cannot be negative');
  if (input.resistance <= 0) throw new Error('resistance must be greater than zero');
  if (typeof input.closed !== 'boolean') {
    throw new Error('closed must be a boolean');
  }
  if (!input.closed) return { current: 0, power: 0, brightness: 0 };

  const current = input.voltage / input.resistance;
  const power = input.voltage * current;
  return {
    current: rounded(current),
    power: rounded(power),
    brightness: rounded(Math.min(current / REFERENCE_CURRENT, 1)),
  };
}
