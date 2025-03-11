import { type TsConfigJson } from 'type-fest';
export declare function pathv(relativePath: string): string;
export type PathvInputPathType = 'ABSOLUTE' | 'PROJECT_RELATIVE_OUTSIDE_SOURCE' | 'PROJECT_RELATIVE_IN_SOURCE' | 'ALIAS';
export type PathvAnalysis = Record<string, {
    realRelPath: string;
    relDistPath: string;
    pathvExp: string;
}>;
export declare function processPathvCalls(content: string, fileAbsPath: string, sourceRelativePath: string, distRelativePath: string): Promise<string>;
export declare function formatSourceContent(content: string, analysis: PathvAnalysis): string;
export declare function analysePaths(content: string, fileAbsPath: string, projectPath: string, tsconfig: TsConfigJson | null, sourceRelativePath: string, distRelativePath: string): PathvAnalysis;
