import { type TsConfigJson } from 'type-fest';
export declare function readTsConfig(possiblePaths: string[], possibleFileNames?: string[]): Promise<TsConfigJson | null>;
export declare function isAliasPath(filepath: string, tsconfig: TsConfigJson): boolean;
export declare function resolveAlias(alias: string, tsconfig: TsConfigJson, projectPath?: string): string[];
