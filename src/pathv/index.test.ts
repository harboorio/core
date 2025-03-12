import { test, expect } from "vitest";
import { type TsConfigJson } from "type-fest";
import { analysePaths, formatSourceContent } from "./index";
import { readTsConfig } from "../tsconfig/index";

test("analyse paths", async () => {
    const tsconfig = (await readTsConfig(["./"])) as TsConfigJson;
    const content = `
import pino from 'pino'
import { pathv } from '@harboor/core'

export { type Logger } from 'pino'

export function createLogger({ name, redact }: { name: string, redact: string[] }) {
    return pino({
        name,
        level: 'info',
        redact,
        transport: {
            targets: [
                {
                    target: pathv('./src/shared/infra/logger/transport-pretty.mjs'),
                    target: pathv('@shared/infra/logger/transport-pretty.mjs'),
                    target: pathv('./transport-pretty.mjs'),
                }
            ]
        }
    })
}
`;
    const analysis = analysePaths(
        content,
        "/users/m/project/src/infra/logger/file.mjs",
        "/users/m/project",
        tsconfig,
        "src",
        "dist",
    );

    expect(analysis).toStrictEqual({
        "pathv('./src/shared/infra/logger/transport-pretty.mjs')": {
            realRelPath: "./src/shared/infra/logger/transport-pretty.mjs",
            relDistPath: "./dist/shared/infra/logger/transport-pretty.mjs",
            pathvExp: `path.resolve(import.meta.dirname, './shared/infra/logger/transport-pretty.mjs')`,
        },
        "pathv('@shared/infra/logger/transport-pretty.mjs')": {
            realRelPath: "./src/shared/infra/logger/transport-pretty.mjs",
            relDistPath: "./dist/shared/infra/logger/transport-pretty.mjs",
            pathvExp: `path.resolve(import.meta.dirname, './shared/infra/logger/transport-pretty.mjs')`,
        },
        "pathv('./transport-pretty.mjs')": {
            realRelPath: "./transport-pretty.mjs",
            relDistPath: "./dist/transport-pretty.mjs",
            pathvExp: `path.resolve(import.meta.dirname, './transport-pretty.mjs')`,
        },
    });

    const content2 = `import * as path from 'node:path';
import pino from 'pino'
import { pathv } from '@harboor/core'

export { type Logger } from 'pino'

export function createLogger({ name, redact }: { name: string, redact: string[] }) {
    return pino({
        name,
        level: 'info',
        redact,
        transport: {
            targets: [
                {
                    target: path.resolve(import.meta.dirname, './shared/infra/logger/transport-pretty.mjs'),
                    target: path.resolve(import.meta.dirname, './shared/infra/logger/transport-pretty.mjs'),
                    target: path.resolve(import.meta.dirname, './transport-pretty.mjs'),
                }
            ]
        }
    })
}
`;
    expect(formatSourceContent(content, analysis)).toBe(content2);
});
