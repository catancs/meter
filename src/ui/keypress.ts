export type KeypressAction = 's' | 'd' | 'c'

export function waitForKeypress(
  validKeys: KeypressAction[],
  timeoutMs: number
): Promise<KeypressAction | 'timeout'> {
  return new Promise(resolve => {
    const cleanup = () => {
      process.stdin.removeListener('data', onData)
      clearTimeout(timer)
    }

    const timer = timeoutMs > 0
      ? setTimeout(() => { cleanup(); resolve('timeout') }, timeoutMs)
      : undefined

    const onData = (data: Buffer) => {
      const key = data.toString().toLowerCase().trim() as KeypressAction
      if (validKeys.includes(key)) {
        cleanup()
        resolve(key)
      }
    }

    process.stdin.on('data', onData)
  })
}
