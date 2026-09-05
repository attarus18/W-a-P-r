export type WeightUnit = 'g' | 'kg' | 'oz' | 'lb';
export type VolumeUnit = 'ml' | 'l' | 'fl_oz';

const GRAMS_PER_UNIT: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
};

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return (value * GRAMS_PER_UNIT[from]) / GRAMS_PER_UNIT[to];
}

const ML_PER_UNIT: Record<VolumeUnit, number> = {
  ml: 1,
  l: 1000,
  fl_oz: 29.5735295625,
};

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  if (from === to) return value;
  return (value * ML_PER_UNIT[from]) / ML_PER_UNIT[to];
}
