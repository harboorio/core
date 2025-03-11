declare function pathv(relativePath: string): string;
declare function processPathvCalls(content: string, fileAbsPath: string, sourceRelativePath: string, distRelativePath: string): Promise<string>;

export { pathv, processPathvCalls };
