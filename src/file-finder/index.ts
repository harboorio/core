import { access, constants } from "node:fs/promises";
import path from "node:path";

export async function fileFinder(possibleFileNames: string[], possiblePaths: string[]) {
    const possibleAbsPaths = possiblePaths.map((_p) => (_p.startsWith("/") ? _p : path.resolve(process.cwd(), _p)));

    const possibleFiles = createLoadingOrder(possibleFileNames, possibleAbsPaths);

    return findFile(possibleFiles);
}

function createLoadingOrder(filenames: string[], possibleAbsPaths: string[]) {
    return possibleAbsPaths.reduce<string[]>((memo, _path) => {
        memo = memo.concat(filenames.map((_name) => path.resolve(_path, _name)));
        return memo;
    }, []);
}

async function findFile(possibleFiles: string[]) {
    for await (const file of possibleFiles) {
        if (await verifyFile(file)) {
            return file;
        }
    }

    return null;
}

export async function verifyFile(_filepath: string) {
    try {
        await access(_filepath, constants.R_OK);
        return true;
    } catch (e) {
        return false;
    }
}
