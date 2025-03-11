import path from "node:path";
import { type TsConfigJson } from "type-fest";
import { test, expect } from "vitest";
import { readTsConfig, isAliasPath, resolveAlias } from "./index";

test("read tsconfig", async () => {
    const result = (await readTsConfig(["./"])) as TsConfigJson;
    expect(result).not.toBe(null);
    expect(result.compilerOptions?.strict).toBe(true);
});

test("aliases", async () => {
    const tsconfig = (await readTsConfig(["./"])) as TsConfigJson;
    expect(isAliasPath("./asd", tsconfig)).toBe(false);
    expect(isAliasPath("@features/path/to/file.txt", tsconfig)).toBe(true);
    expect(resolveAlias("@features/path/to/file.txt", tsconfig)).toStrictEqual([
        path.resolve(process.cwd(), "./src/features/path/to/file.txt"),
    ]);
});
