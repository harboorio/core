import path from "node:path";
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { dts } from 'rollup-plugin-dts'

export default [
    {
        input: path.resolve(import.meta.dirname, 'src/index.ts'),
        output: [
            {
                format: 'es',
                file: 'dist/index.js',
                sourcemap: true
            },
            {
                format: 'cjs',
                file: 'dist/index.cjs',
                sourcemap: true
            }
        ],
        plugins: [
            typescript({ emitDeclarationOnly: true }),
            commonjs({ sourceMap: true, extensions: ['.js', '.ts'] }),
            babel({
                extensions: ['.ts'],
                include: ['src/**/*.ts'],
                babelHelpers: 'bundled',
                babelrc: false,
                presets: ['@babel/preset-typescript'],
                plugins: []
            }),
        ]
    },
    {
        input: "./dist/index.d.ts",
        output: [{ file: "dist/index.d.cts", format: "cjs" }],
        plugins: [dts()],
    }
]