export type NumberBool = 0 | 1;

export function numberBool(bool: true): 1;
export function numberBool(bool: false): 0;
export function numberBool(bool: boolean): NumberBool;
export function numberBool(bool: boolean): NumberBool {
    return bool ? 1 : 0;
}
