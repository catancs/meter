import { writeFile, mkdir, chmod, access } from 'fs/promises'
import { dirname } from 'path'

const SHIM_EXEC_TEMPLATE = (trueBinary: string, meterBin: string) =>
`#!/bin/sh
# meter shim — do not edit manually
exec "${meterBin}" wrap "${trueBinary}" "$@"
`

export async function writeShim(
  shimPath: string,
  trueBinary: string,
  meterEntrypoint?: string
): Promise<void> {
  await mkdir(dirname(shimPath), { recursive: true })
  const content = SHIM_EXEC_TEMPLATE(trueBinary, meterEntrypoint ?? 'meter')
  await writeFile(shimPath, content, 'utf-8')
  await chmod(shimPath, 0o755)
}

export async function shimExists(shimPath: string): Promise<boolean> {
  try {
    await access(shimPath)
    return true
  } catch {
    return false
  }
}
