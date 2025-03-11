import { mkdir, writeFile } from "node:fs/promises";
import {
    SecretsManagerClient,
    GetSecretValueCommand,
    type GetSecretValueCommandOutput,
} from "@aws-sdk/client-secrets-manager";
import * as os from "node:os";
import * as path from "node:path";

export type DumpArgs = {
    aws: {
        credentials: {
            region: string;
            accessKey: string;
            accessKeySecret: string;
        };
        secretName: string;
    };
    dest?: string;
};

export async function fetchSecretsAws<E extends Record<string, string | number | boolean>>({ aws, dest }: DumpArgs) {
    const { credentials, secretName } = aws;
    const { region, accessKey, accessKeySecret } = credentials;
    const client = new SecretsManagerClient({
        region,
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: accessKeySecret,
        },
    });

    let response: GetSecretValueCommandOutput;

    try {
        response = await client.send(
            new GetSecretValueCommand({
                SecretId: secretName,
            }),
        );
    } catch (e) {
        return e;
    }

    if (!response.SecretString) {
        return new Error("No text found in the response.");
    }

    const secrets = JSON.parse(response.SecretString) as E;

    if (dest) {
        await save(dest, secrets);
    }

    return secrets;
}

export async function save(dest: string, secrets: Record<string, string | number | boolean>) {
    const _dest = path.isAbsolute(dest) ? dest : path.resolve(process.cwd(), dest);
    const dir = path.dirname(_dest);
    await mkdir(dir, { recursive: true });

    const ext = path.extname(_dest);
    const format = ext === ".env" ? "dotenv" : ext === ".sh" ? "shell" : "dotenv";
    const data = Object.keys(secrets).reduce<string>(
        (memo, name) => memo + processPair(format, name, secrets[name]),
        "",
    );

    await writeFile(_dest, data, { mode: process.env.VITEST ? 0o777 : 0o455 });

    return true;

    function processPair(format: "dotenv" | "shell", name: string, value: string | number | boolean) {
        switch (format) {
            case "dotenv":
                return name + '="' + value + '"' + os.EOL;
            case "shell":
                return "export " + name + '="' + value + '"' + os.EOL;
            default:
                return name + '="' + value + '"' + os.EOL;
        }
    }
}
