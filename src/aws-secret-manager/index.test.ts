import path from "node:path";
import { access, constants, readFile, rm } from "node:fs/promises";
import { afterAll, expect, test } from "vitest";
import { save } from "./index";

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
