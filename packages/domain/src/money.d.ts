export type MoneyPaise = number;
export declare function rupeesToPaise(rupees: number): MoneyPaise;
export declare function paiseToRupees(paise: MoneyPaise): number;
export declare function addPaise(...parts: MoneyPaise[]): MoneyPaise;
export declare function assertNonNegativePaise(paise: MoneyPaise, label?: string): void;
