export type NumberBool = 0 | 1;

export function boolToNum(bool: true): 1;
export function boolToNum(bool: false): 0;
export function boolToNum(bool: boolean): NumberBool;
export function boolToNum(bool: boolean): NumberBool {
    return bool ? 1 : 0;
}
