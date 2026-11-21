declare module 'suncalc' {
  const SunCalc: {
    getMoonIllumination(date: Date): { fraction: number; phase: number; angle: number };
  };
  export default SunCalc;
  export function getMoonIllumination(date: Date): { fraction: number; phase: number; angle: number };
}
