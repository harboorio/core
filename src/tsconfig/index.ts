import { type TsConfigJson } from "type-fest";
import { readFile } from "node:fs/promises";
import { fileFinder } from "../file-finder/index";
import path from "node:path";

export async function readTsConfig(possiblePaths: string[], possibleFileNames: string[] = ["tsconfig.json"]) {
    const location = await fileFinder(possibleFileNames, possiblePaths);
    if (!location) return null;

    return JSON.parse(await readFile(location, "utf-8")) as TsConfigJson;
}

export function isAliasPath(filepath: string, tsconfig: TsConfigJson) {
    const aliases = findAliases(tsconfig);
    return Object.keys(aliases).some((pattern) => filepath.startsWith(pattern.replace("*", "")));
}

export function resolveAlias(alias: string, tsconfig: TsConfigJson, projectPath?: string) {
    const _searchPath = projectPath ?? process.cwd();
    const aliases = findAliases(tsconfig);
    const pattern = Object.keys(aliases).find((_pattern) => alias.startsWith(_pattern.replace("*", "")))!;
    if (!pattern.includes("*")) {
        return aliases[pattern].map((p) => path.resolve(_searchPath, p));
    }

    const _input = alias.replace(pattern.replace("*", ""), "");
    return aliases[pattern].map((p) => path.resolve(_searchPath, p.replace("*", _input)));
}

function findAliases(tsconfig: TsConfigJson) {
    return tsconfig ? (tsconfig?.compilerOptions?.paths ?? {}) : {};
}
