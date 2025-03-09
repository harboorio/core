declare const rePathvCalls = "(pathv(('|\"))(.*)(('|\")))";
declare function pathv(relativePath: string): string;

export { pathv, rePathvCalls };
