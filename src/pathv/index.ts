import path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { readTsConfig, isAliasPath, resolveAlias } from "../tsconfig/index";
import { type TsConfigJson } from "type-fest";

export function pathv(relativePath: string) {
    return relativePath;
}

export type PathvInputPathType =
    | "ABSOLUTE"
    | "PROJECT_RELATIVE_OUTSIDE_SOURCE"
    | "PROJECT_RELATIVE_IN_SOURCE"
    | "ALIAS";
export type PathvAnalysis = Record<
    string,
    {
        realRelPath: string;
        relDistPath: string;
        pathvExp: string;
    }
>;

const rePathvCalls = `(pathv\\(('|")(.*)('|"))\\)`;
const rePathvCallsGM = new RegExp(rePathvCalls, "gm");
const rePathvCallsNoFlag = new RegExp(rePathvCalls, "");

export function hasPathvCalls(content: string) {
    return rePathvCallsGM.test(content);
}

function findProjectPath(sourceRelativePath: string) {
    const _src = path.normalize(sourceRelativePath);
    const cwd = process.cwd();
    return cwd.endsWith(_src)
        ? path.resolve(
              cwd,
              _src
                  .split("/")
                  .map(() => "..")
                  .join("/"),
          )
        : cwd;
}

export async function processPathvCalls(
    content: string,
    fileAbsPath: string,
    sourceRelativePath: string,
    distRelativePath: string,
) {
    const projectPath = findProjectPath(sourceRelativePath);
    const tsconfig = await readTsConfig([path.resolve(projectPath, sourceRelativePath), projectPath]);
    const analysis = analysePaths(content, fileAbsPath, projectPath, tsconfig, sourceRelativePath, distRelativePath);

    await distAnalysedFiles(analysis, projectPath);

    return formatSourceContent(content, analysis);
}

export function formatSourceContent(content: string, analysis: PathvAnalysis) {
    return Object.keys(analysis).reduce<string>(
        (memo, token) => memo.replace(token, analysis[token].pathvExp),
        `import * as path from 'node:path';` + content,
    );
}

async function distAnalysedFiles(analysis: PathvAnalysis, projectPath: string) {
    for await (const { realRelPath, relDistPath } of Object.values(analysis)) {
        const fileDistDir = path.resolve(projectPath, path.dirname(relDistPath));
        await mkdir(fileDistDir, { recursive: true });
        await copyFile(path.resolve(projectPath, realRelPath), path.resolve(projectPath, relDistPath));
    }
}

export function analysePaths(
    content: string,
    fileAbsPath: string,
    projectPath: string,
    tsconfig: TsConfigJson | null,
    sourceRelativePath: string,
    distRelativePath: string,
) {
    const matches = content.match(rePathvCallsGM);

    if (!matches) {
        return {};
    }

    const matchesFormatted = matches.map((text) => text.match(rePathvCallsNoFlag));
    const result: PathvAnalysis = {};
    for (const _matches of matchesFormatted) {
        if (!_matches) continue;
        const input = _matches[3];
        const inputType = findInputType(input);
        const realRelPath = findRealRelativePath(input, inputType);
        const relDistPath = findCorrespondingDistPath(realRelPath, inputType);

        result[_matches[0]] = {
            realRelPath,
            relDistPath,
            pathvExp: `path.resolve(import.meta.dirname, '${"./" + path.relative(distRelativePath, relDistPath)}')`,
        };
    }

    return result;

    function findRealRelativePath(input: string, inputType: PathvInputPathType) {
        switch (inputType) {
            case "PROJECT_RELATIVE_OUTSIDE_SOURCE":
                return input;
            case "PROJECT_RELATIVE_IN_SOURCE":
                return input;
            case "ALIAS":
                const resolved = resolveAlias(input, tsconfig!, projectPath)[0];
                return "./" + path.relative(projectPath, resolved);
            case "ABSOLUTE":
                return input.includes(projectPath)
                    ? path.relative(path.resolve(projectPath, sourceRelativePath), input)
                    : input;
        }
    }

    function findCorrespondingDistPath(projectRelativeFilePath: string, inputType: PathvInputPathType) {
        if (projectRelativeFilePath.startsWith("/")) {
            return path.join(projectPath, distRelativePath, projectRelativeFilePath);
        }

        if (inputType === "PROJECT_RELATIVE_OUTSIDE_SOURCE") {
            return "./" + path.join(distRelativePath, projectRelativeFilePath);
        }

        return "./" + path.join(distRelativePath, path.relative(sourceRelativePath, projectRelativeFilePath));
    }

    function findInputType(input: string): PathvInputPathType {
        if (input.startsWith("/")) {
            return "ABSOLUTE";
        } else if (tsconfig && isAliasPath(input, tsconfig)) {
            return "ALIAS";
        } else if (path.normalize(input).includes(path.normalize(sourceRelativePath))) {
            return "PROJECT_RELATIVE_IN_SOURCE";
        } else {
            return "PROJECT_RELATIVE_OUTSIDE_SOURCE";
        }
    }
}
