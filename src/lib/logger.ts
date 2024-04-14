export const logger = {
  log: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.log(
      `%c 白い %c`,
      'color: #fff; margin: 1em 0; padding: 5px 0; background: #39C5BB;',
      ...args.reduce((acc, cur) => {
        acc.push('')
        acc.push(cur)
        return acc
      }, []),
    )
  },
}