import path from "node:path";
import { access, constants, readFile, rm } from "node:fs/promises";
import { afterAll, expect, test } from "vitest";
import { save, resolveReferencesRecursive } from "./index";

const secrets = {
    abc: 1,
    dfg: "lorem ipsum",
};
const dest = path.resolve(import.meta.dirname, "tmp/.env");
const dest2 = path.resolve(import.meta.dirname, "tmp/env.sh");

afterAll(async () => {
    await rm(path.dirname(dest), { recursive: true, force: true });
});

test("save .env", async () => {
    const result = await save(dest, secrets);

    expect(result).toBe(true);
    expect(async () => access(dest, constants.R_OK)).not.toThrow();

    const data = await readFile(dest, "utf-8");
    expect(data).toBe(`abc="1"
dfg="lorem ipsum"
`);
});

test("save .sh", async () => {
    const result = await save(dest2, secrets);

    expect(result).toBe(true);
    expect(async () => access(dest2, constants.R_OK)).not.toThrow();

    const data = await readFile(dest2, "utf-8");
    expect(data).toBe(`export abc="1"
export dfg="lorem ipsum"
`);
});

test("resolve references", () => {
    const secrets = {
        PASS: "abc123",
        USER: "me",
        CONN_STR: "protocol://${USER}:${PASS}@db",
    };
    const resolved = {
        PASS: "abc123",
        USER: "me",
        CONN_STR: "protocol://me:abc123@db",
    };
    const result = resolveReferencesRecursive(secrets);
    expect(result).toStrictEqual(resolved);

    const secrets2 = {
        PASS: "abc123",
        USER: "me",
        CONN_STR: "protocol://${USERR}:${PASSS}@db",
    };
    const resolved2 = {
        PASS: "abc123",
        USER: "me",
        CONN_STR: "protocol://${USERR}:${PASSS}@db",
    };
    const result2 = resolveReferencesRecursive(secrets2);
    expect(result2).toStrictEqual(resolved2);

    const secrets3 = {
        PASS: "abc123",
    };
    const resolved3 = {
        PASS: "abc123",
    };
    const result3 = resolveReferencesRecursive(secrets3);
    expect(result3).toStrictEqual(resolved3);
});
