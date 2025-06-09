export const ClientTypeValues = ['web', 'mobile'] as const;
export type ClientTypes = (typeof ClientTypeValues)[number];
export const isClientType = (x: any): x is ClientTypes =>
  ClientTypeValues.includes(x);
