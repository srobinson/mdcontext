/**
 * Argv Preprocessor - Enables flexible flag positioning
 *
 * Effect CLI requires flags before positional args, but users expect
 * to be able to do either:
 *   mdtldr search "query" --limit 5
 *   mdtldr search --limit 5 "query"
 *
 * This preprocessor reorders argv so flags always come first for each
 * subcommand, while preserving the user's intended positional arg order.
 */

/**
 * Check if an argument looks like a flag
 */
const isFlag = (arg: string): boolean => {
  return arg.startsWith('-')
}

/**
 * Check if a flag expects a value (known value flags)
 */
const flagsWithValues = new Set([
  '-n',
  '--limit',
  '-t',
  '--tokens',
  '--threshold',
  '-r',
  '--root',
])

/**
 * Check if this flag takes a value
 */
const flagTakesValue = (flag: string): boolean => {
  // Handle --flag=value syntax
  if (flag.includes('=')) {
    return false // Value is already embedded
  }
  return flagsWithValues.has(flag)
}

/**
 * Preprocess argv to put flags before positional arguments
 *
 * Transforms: ['search', 'query', '--limit', '5', 'path']
 * Into:       ['search', '--limit', '5', 'query', 'path']
 */
export const preprocessArgv = (argv: string[]): string[] => {
  // argv[0] = node, argv[1] = script, rest = user args
  const nodeAndScript = argv.slice(0, 2)
  const userArgs = argv.slice(2)

  if (userArgs.length === 0) {
    return argv
  }

  // Check if first arg is a subcommand (not a flag)
  const firstArg = userArgs[0]
  if (!firstArg || isFlag(firstArg)) {
    // No subcommand, return as-is
    return argv
  }

  const subcommand = firstArg
  const restArgs = userArgs.slice(1)

  // Separate flags (with their values) from positional args
  const flags: string[] = []
  const positionals: string[] = []

  let i = 0
  while (i < restArgs.length) {
    const arg = restArgs[i]
    if (!arg) {
      i++
      continue
    }

    if (isFlag(arg)) {
      // It's a flag
      if (arg.includes('=')) {
        // --flag=value syntax, keep as single arg
        flags.push(arg)
        i++
      } else if (flagTakesValue(arg)) {
        // Flag with separate value
        flags.push(arg)
        i++
        // Grab the value if it exists and isn't another flag
        if (i < restArgs.length) {
          const nextArg = restArgs[i]
          if (nextArg && !isFlag(nextArg)) {
            flags.push(nextArg)
            i++
          }
        }
      } else {
        // Boolean flag
        flags.push(arg)
        i++
      }
    } else {
      // Positional argument
      positionals.push(arg)
      i++
    }
  }

  // Reconstruct: node, script, subcommand, flags, positionals
  return [...nodeAndScript, subcommand, ...flags, ...positionals]
}
