# Effect for CLI Development and Configuration Management

## Executive Summary

This research evaluates Effect's ecosystem for building CLI applications and managing configuration. Effect provides a comprehensive, type-safe foundation through `@effect/cli` for command-line interfaces and its built-in `Config` module for configuration management.

**Key Findings**:

- `@effect/cli` offers a declarative, composable approach to CLI development with automatic help generation, wizard mode, and shell completions
- Effect's `Config` module provides type-safe configuration loading with `ConfigProvider` abstraction for multiple sources
- The `Layer` system enables elegant dependency injection and configuration composition
- Effect's `Redacted` type provides first-class secrets handling
- Real-world adoption includes Effect's own tooling, VS Code extension, and Discord bot

**Recommendation**: Effect is a strong candidate for mdcontext's CLI and config layer, offering superior type safety and composability compared to traditional approaches. However, it requires commitment to the Effect paradigm throughout the application.

---

## 1. @effect/cli - Command-Line Interface Framework

### Overview

`@effect/cli` is a declarative framework for building type-safe CLI applications. It provides:

- Hierarchical command structures (commands and subcommands)
- Type-safe argument and option parsing
- Automatic help documentation generation
- Interactive wizard mode
- Shell completion generation (bash, zsh, fish, sh)
- Built-in logging level control

**Installation**:

```bash
npm install @effect/cli @effect/platform @effect/platform-node effect
```

### Core Concepts

#### Commands

Commands are the fundamental building blocks. Each command has:

- **Name**: Identifier for invocation
- **Configuration**: Options and arguments
- **Handler**: Effect-returning function

```typescript
import { Args, Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";

// Define a simple command
const greet = Command.make(
  "greet", // Command name
  { name: Args.text({ name: "name" }) }, // Arguments
  ({ name }) => Console.log(`Hello, ${name}!`), // Handler
);

// Run the CLI
const cli = Command.run(greet, {
  name: "My CLI",
  version: "1.0.0",
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
```

#### Arguments (Args)

Arguments are positional values passed to commands.

```typescript
import { Args } from "@effect/cli";

// Basic types
const textArg = Args.text({ name: "message" });
const numberArg = Args.integer({ name: "count" });
const floatArg = Args.float({ name: "value" });
const boolArg = Args.boolean({ name: "flag" });
const dateArg = Args.date({ name: "when" });

// File system
const fileArg = Args.file({ name: "input" });
const dirArg = Args.directory({ name: "output" });
const pathArg = Args.path({ name: "location" });

// File content (reads and returns content)
const fileContent = Args.fileContent({ name: "config" });
const fileText = Args.fileText({ name: "readme" });

// Modifiers
const optionalArg = Args.text({ name: "desc" }).pipe(Args.optional);
const repeatedArg = Args.text({ name: "files" }).pipe(Args.repeated);
const withDefault = Args.integer({ name: "port" }).pipe(Args.withDefault(3000));
const validated = Args.text({ name: "email" }).pipe(
  Args.validate((v) => v.includes("@"), "Must be a valid email"),
);

// Choice from predefined values
const format = Args.choice("format", ["json", "yaml", "toml"]);
```

#### Options

Options are named flags with optional values.

```typescript
import { Options } from "@effect/cli";

// Boolean flags
const verbose = Options.boolean("verbose").pipe(Options.withAlias("v"));
const debug = Options.boolean("debug").pipe(
  Options.withDefault(false),
  Options.withDescription("Enable debug mode"),
);

// Valued options
const port = Options.integer("port").pipe(
  Options.withAlias("p"),
  Options.withDefault(8080),
);

const host = Options.text("host").pipe(Options.withDefault("localhost"));

// Choice options
const logLevel = Options.choice("log-level", [
  "debug",
  "info",
  "warn",
  "error",
]).pipe(Options.withDefault("info"));

// Optional values
const config = Options.file("config").pipe(
  Options.withAlias("c"),
  Options.optional,
);

// Repeated options (--include a --include b)
const includes = Options.text("include").pipe(
  Options.withAlias("i"),
  Options.repeated,
);

// Sensitive data (not shown in help/logs)
const apiKey = Options.redacted("api-key");
const secret = Options.secret("token"); // Deprecated, use redacted

// Key-value maps (--header "Content-Type: application/json")
const headers = Options.keyValueMap("header");

// Schema validation
import { Schema } from "effect";
const email = Options.text("email").pipe(
  Options.withSchema(Schema.String.pipe(Schema.includes("@"))),
);
```

#### Subcommands

Commands can be nested to create hierarchical CLI structures.

```typescript
import { Args, Command, Options } from "@effect/cli";
import { Console, Effect } from "effect";

// Define subcommands
const add = Command.make(
  "add",
  {
    files: Args.text({ name: "pathspec" }).pipe(Args.repeated),
    verbose: Options.boolean("verbose").pipe(Options.withAlias("v")),
  },
  ({ files, verbose }) =>
    Effect.gen(function* () {
      if (verbose) yield* Console.log(`Adding ${files.length} files`);
      yield* Console.log(`git add ${files.join(" ")}`);
    }),
);

const commit = Command.make(
  "commit",
  {
    message: Options.text("message").pipe(Options.withAlias("m")),
    amend: Options.boolean("amend").pipe(Options.withDefault(false)),
  },
  ({ message, amend }) =>
    Console.log(`git commit ${amend ? "--amend" : ""} -m "${message}"`),
);

const clone = Command.make(
  "clone",
  {
    url: Args.text({ name: "repository" }),
    directory: Args.text({ name: "directory" }).pipe(Args.optional),
  },
  ({ url, directory }) =>
    Console.log(`git clone ${url}${directory ? ` ${directory}` : ""}`),
);

// Parent command with subcommands
const git = Command.make("git", {}).pipe(
  Command.withSubcommands([add, commit, clone]),
);

// Run
const cli = Command.run(git, {
  name: "minigit",
  version: "1.0.0",
});
```

#### Accessing Parent Command Context

Subcommands can access their parent's configuration:

```typescript
const child = Command.make(
  "child",
  { childArg: Args.text({ name: "value" }) },
  ({ childArg }) =>
    // Access parent command's parsed config
    parent.pipe(
      Effect.flatMap((parentConfig) =>
        Console.log(
          `Parent verbose: ${parentConfig.verbose}, Child arg: ${childArg}`,
        ),
      ),
    ),
);

const parent = Command.make("parent", {
  verbose: Options.boolean("verbose"),
}).pipe(Command.withSubcommands([child]));
```

### Built-in Features

Every `@effect/cli` application automatically includes:

| Flag                    | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `--version`             | Display application version                      |
| `-h, --help`            | Show help documentation                          |
| `--wizard`              | Interactive command builder                      |
| `--completions [shell]` | Generate shell completions (bash, sh, fish, zsh) |
| `--log-level`           | Set minimum log level for handlers               |

#### Wizard Mode

The `--wizard` flag provides an interactive prompt-based interface for building commands:

```bash
$ mycli --wizard
Wizard Mode for CLI Application: My CLI (v1.0.0)

Instructions
The wizard mode will assist you with constructing commands for My CLI (v1.0.0).
Please answer all prompts provided by the wizard.

COMMAND: greet
? Enter name: Alice

Wizard Mode Complete!
You may now execute your command directly with the following options and arguments:
  greet Alice

? Would you like to run the command? (y/n)
```

#### Shell Completions

```bash
# Generate completions
mycli --completions bash > ~/.bash_completion.d/mycli
mycli --completions zsh > ~/.zsh/completions/_mycli
mycli --completions fish > ~/.config/fish/completions/mycli.fish
```

### Complete CLI Example

```typescript
import { Args, Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect, Option } from "effect";

// Color codes for ANSI
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
} as const;

type Color = keyof typeof colors;

// Define arguments and options
const text = Args.text({ name: "text" });
const bold = Options.boolean("bold").pipe(Options.withAlias("b"));
const color = Options.choice("color", [
  "red",
  "green",
  "blue",
  "yellow",
] as const).pipe(Options.withAlias("c"), Options.optional);
const count = Args.integer({ name: "count" }).pipe(Args.withDefault(1));

// Echo command - prints text with optional formatting
const echo = Command.make(
  "echo",
  { text, bold, color },
  ({ text, bold, color }) => {
    let output = text;

    // Apply color if specified
    if (Option.isSome(color)) {
      output = `${colors[color.value]}${output}${colors.reset}`;
    }

    // Apply bold if specified
    if (bold) {
      output = `${colors.bold}${output}${colors.reset}`;
    }

    return Console.log(output);
  },
);

// Repeat command - repeats the echo command multiple times
const repeat = Command.make("repeat", { count }, ({ count }) =>
  echo.pipe(
    Effect.flatMap((config) => Effect.repeatN(echo.handler(config), count - 1)),
  ),
);

// Main command with subcommands
const main = echo.pipe(Command.withSubcommands([repeat]));

// Create and run CLI
const cli = Command.run(main, {
  name: "Echo CLI",
  version: "1.0.0",
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
```

Usage:

```bash
# Basic echo
$ echo-cli "Hello, World!"
Hello, World!

# With formatting
$ echo-cli "Hello" --bold --color green
Hello  # (in bold green)

# Repeat subcommand
$ echo-cli repeat 3 "Hi"
Hi
Hi
Hi

# Help
$ echo-cli --help
# Shows auto-generated help

# Wizard mode
$ echo-cli --wizard
# Interactive prompt for building command
```

---

## 2. @effect/platform - Platform Abstractions

### Overview

`@effect/platform` provides platform-independent abstractions for:

- **FileSystem** - File and directory operations
- **Terminal** - stdin/stdout interaction
- **Command** - Process execution
- **Path** - Cross-platform path utilities
- **KeyValueStore** - Persistent storage
- **PlatformLogger** - File-based logging

Platform-specific implementations:

- `@effect/platform-node` - Node.js/Deno
- `@effect/platform-bun` - Bun runtime
- `@effect/platform-browser` - Browser environments

### FileSystem

```typescript
import { FileSystem } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  // Check existence
  const exists = yield* fs.exists("./config.json");

  // Read file
  const content = yield* fs.readFileString("./config.json", "utf8");

  // Write file
  yield* fs.writeFileString("./output.txt", "Hello, World!");

  // Read directory
  const files = yield* fs.readDirectory("./src");

  // Create directory
  yield* fs.makeDirectory("./dist", { recursive: true });

  // Copy file
  yield* fs.copyFile("./src/index.ts", "./dist/index.ts");

  // Remove file/directory
  yield* fs.remove("./temp", { recursive: true });

  // Watch for changes
  const watcher = yield* fs.watch("./src");
  // watcher is a Stream of file system events

  // Temporary files (auto-cleaned with Scope)
  const tempFile = yield* fs.makeTempFileScoped();
  yield* fs.writeFileString(tempFile, "temp content");
  // File is deleted when scope closes
});

NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)));
```

### Terminal

```typescript
import { Terminal } from "@effect/platform";
import { NodeRuntime, NodeTerminal } from "@effect/platform-node";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const terminal = yield* Terminal.Terminal;

  // Read a line from stdin
  const name = yield* terminal.readLine;

  // Display output
  yield* terminal.display(`Hello, ${name}!\n`);

  // Log (with newline)
  yield* Terminal.log("This is a log message");
});

NodeRuntime.runMain(program.pipe(Effect.provide(NodeTerminal.layer)));
```

### Command (Process Execution)

```typescript
import { Command } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Stream, String, pipe } from "effect";

// Helper to collect stream as string
const streamToString = <E, R>(
  stream: Stream.Stream<Uint8Array, E, R>,
): Effect.Effect<string, E, R> =>
  stream.pipe(Stream.decodeText(), Stream.runFold(String.empty, String.concat));

const program = Effect.gen(function* () {
  // Simple command execution
  const exitCode = yield* Command.make("echo", "Hello").pipe(Command.exitCode);

  // Capture stdout as string
  const output = yield* Command.make("ls", "-la").pipe(Command.string);
  console.log(output);

  // Capture stdout as lines
  const lines = yield* Command.make("cat", "file.txt").pipe(Command.lines);

  // Stream stdout to process.stdout
  yield* Command.make("cat", "./large-file.txt").pipe(
    Command.stdout("inherit"),
    Command.exitCode,
  );

  // Full process control
  const [exitCode2, stdout, stderr] = yield* pipe(
    Command.make("npm", "install"),
    Command.start,
    Effect.flatMap((process) =>
      Effect.all(
        [
          process.exitCode,
          streamToString(process.stdout),
          streamToString(process.stderr),
        ],
        { concurrency: 3 },
      ),
    ),
  );

  // Working directory and environment
  yield* Command.make("npm", "test").pipe(
    Command.workingDirectory("./packages/core"),
    Command.env({ NODE_ENV: "test" }),
    Command.exitCode,
  );

  // Pipe commands together
  yield* Command.make("cat", "file.txt").pipe(
    Command.pipeTo(Command.make("grep", "pattern")),
    Command.string,
  );
});

NodeRuntime.runMain(
  Effect.scoped(program).pipe(Effect.provide(NodeContext.layer)),
);
```

---

## 3. Effect Config Module

### Overview

Effect provides a built-in configuration system with:

- Type-safe config primitives
- `ConfigProvider` abstraction for loading from various sources
- Composition and transformation combinators
- First-class secrets handling with `Redacted`

### Basic Configuration

```typescript
import { Effect, Config } from "effect";

const program = Effect.gen(function* () {
  // Basic types
  const host = yield* Config.string("HOST");
  const port = yield* Config.number("PORT");
  const debug = yield* Config.boolean("DEBUG");
  const timeout = yield* Config.duration("TIMEOUT"); // "1s", "500ms", etc.
  const logLevel = yield* Config.logLevel("LOG_LEVEL"); // LogLevel type
  const apiUrl = yield* Config.url("API_URL"); // URL type

  console.log(`Server: ${host}:${port}`);
});

// Run with environment variables:
// HOST=localhost PORT=8080 npx tsx index.ts
Effect.runPromise(program);
```

### Config Combinators

```typescript
import { Effect, Config, ConfigError } from "effect";

const program = Effect.gen(function* () {
  // Default values
  const port = yield* Config.number("PORT").pipe(Config.withDefault(3000));

  // Optional values
  const apiKey = yield* Config.string("API_KEY").pipe(
    Config.optional, // Returns Option<string>
  );

  // Validation
  const port2 = yield* Config.number("PORT").pipe(
    Config.validate({
      message: "Port must be between 1 and 65535",
      validation: (n) => n >= 1 && n <= 65535,
    }),
  );

  // Transformation
  const portString = yield* Config.number("PORT").pipe(
    Config.map((n) => n.toString()),
  );

  // Nested configuration (reads SERVER_HOST, SERVER_PORT)
  const serverHost = yield* Config.nested(Config.string("HOST"), "SERVER");
  const serverPort = yield* Config.nested(Config.number("PORT"), "SERVER");

  // Combine multiple configs
  const [host, port3] = yield* Config.all([
    Config.string("HOST"),
    Config.number("PORT"),
  ]);

  // Struct-based combination
  const serverConfig = yield* Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
    debug: Config.boolean("DEBUG").pipe(Config.withDefault(false)),
  });
  // serverConfig: { host: string, port: number, debug: boolean }

  // Fallback to alternative config
  const port4 = yield* Config.number("PORT").pipe(
    Config.orElse(() => Config.number("SERVER_PORT")),
  );

  // Array of values (comma-separated)
  const hosts = yield* Config.array(Config.string("HOSTS"));
  // HOSTS=a,b,c => ["a", "b", "c"]

  // Set of values
  const tags = yield* Config.hashSet(Config.string("TAGS"));

  // Map of values
  const headers = yield* Config.hashMap(Config.string("HEADERS"));
});
```

### Sensitive Data with Redacted

```typescript
import { Effect, Config, Redacted } from "effect";

const program = Effect.gen(function* () {
  // Load sensitive value as Redacted
  const apiKey = yield* Config.redacted("API_KEY");
  // apiKey: Redacted<string>

  // Safe to log - shows "<redacted>"
  console.log(`API Key: ${apiKey}`); // "API Key: <redacted>"

  // Access actual value when needed
  const actualKey = Redacted.value(apiKey);
  // actualKey: string

  // Use in HTTP request (unwrap at point of use)
  yield* makeApiCall({
    headers: {
      Authorization: `Bearer ${Redacted.value(apiKey)}`,
    },
  });
});
```

### ConfigProvider

ConfigProvider is the abstraction for loading configuration from various sources.

```typescript
import { Effect, Config, ConfigProvider, Layer } from "effect";

// Default: loads from environment variables
// No setup needed, this is the default behavior

// From a Map (useful for testing)
const testProvider = ConfigProvider.fromMap(
  new Map([
    ["HOST", "localhost"],
    ["PORT", "8080"],
    ["DEBUG", "true"],
  ]),
);

// From JSON object
const jsonProvider = ConfigProvider.fromJson({
  HOST: "localhost",
  PORT: 8080,
  DEBUG: true,
  SERVER: {
    HOST: "api.example.com",
    PORT: 443,
  },
});

// From environment with custom delimiters
const envProvider = ConfigProvider.fromEnv({
  pathDelim: "__", // For nested: SERVER__HOST
  seqDelim: "|", // For arrays: HOSTS=a|b|c
});

// Provider combinators
const combinedProvider = ConfigProvider.fromMap(
  new Map([["A", "from-map"]]),
).pipe(
  // Fall back to environment if not found in map
  ConfigProvider.orElse(() => ConfigProvider.fromEnv()),
);

// Nested provider (all keys prefixed)
const nestedProvider = ConfigProvider.fromEnv().pipe(
  ConfigProvider.nested("MYAPP"),
);
// Reads MYAPP_HOST instead of HOST

// Case conversion
const snakeCaseProvider = ConfigProvider.fromEnv().pipe(
  ConfigProvider.snakeCase, // Converts camelCase keys to SNAKE_CASE
);

const constantCaseProvider = ConfigProvider.fromEnv().pipe(
  ConfigProvider.constantCase, // Converts to CONSTANT_CASE
);

// Use a custom provider
const program = Effect.gen(function* () {
  const host = yield* Config.string("HOST");
  const port = yield* Config.number("PORT");
  return { host, port };
});

// Option 1: withConfigProvider
Effect.runPromise(Effect.withConfigProvider(program, testProvider));

// Option 2: Layer.setConfigProvider
const configLayer = Layer.setConfigProvider(testProvider);
Effect.runPromise(program.pipe(Effect.provide(configLayer)));
```

### Schema-Based Configuration

```typescript
import { Effect, Config, Schema } from "effect";

// Define a schema for configuration
const ServerConfigSchema = Schema.Struct({
  host: Schema.String,
  port: Schema.Number.pipe(Schema.between(1, 65535)),
  debug: Schema.optional(Schema.Boolean, { default: () => false }),
});

type ServerConfig = Schema.Schema.Type<typeof ServerConfigSchema>;

// Use Schema.Config to load and validate
const serverConfig = Schema.Config("SERVER", ServerConfigSchema);

const program = Effect.gen(function* () {
  const config = yield* serverConfig;
  // config: ServerConfig (fully typed and validated)
  console.log(`Server: ${config.host}:${config.port}`);
});
```

---

## 4. Layer System for Configuration

### Overview

Effect's Layer system provides:

- Dependency injection with full type safety
- Composable service construction
- Resource lifecycle management
- Configuration-to-service pipelines

### Basic Layer Pattern

```typescript
import { Context, Effect, Layer } from "effect";

// 1. Define a service interface using Context.Tag
class Config extends Context.Tag("Config")<
  Config,
  {
    readonly host: string;
    readonly port: number;
    readonly debug: boolean;
  }
>() {}

// 2. Create a Layer that provides the service
const ConfigLive = Layer.succeed(Config, {
  host: "localhost",
  port: 8080,
  debug: false,
});

// 3. Create a program that uses the service
const program = Effect.gen(function* () {
  const config = yield* Config;
  console.log(`Server: ${config.host}:${config.port}`);
});

// 4. Provide the layer and run
Effect.runPromise(program.pipe(Effect.provide(ConfigLive)));
```

### Config-Based Layers

```typescript
import { Context, Effect, Layer, Config } from "effect";

// Service definition
class AppConfig extends Context.Tag("AppConfig")<
  AppConfig,
  {
    readonly host: string;
    readonly port: number;
    readonly debug: boolean;
    readonly apiKey: string;
  }
>() {}

// Layer that loads from Config
const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const host = yield* Config.string("HOST").pipe(
      Config.withDefault("localhost"),
    );
    const port = yield* Config.number("PORT").pipe(Config.withDefault(3000));
    const debug = yield* Config.boolean("DEBUG").pipe(
      Config.withDefault(false),
    );
    const apiKey = yield* Config.string("API_KEY");

    return { host, port, debug, apiKey };
  }),
);

// Use the config service
const program = Effect.gen(function* () {
  const config = yield* AppConfig;
  yield* Effect.log(`Starting server on ${config.host}:${config.port}`);
});

// Run with environment variables
Effect.runPromise(program.pipe(Effect.provide(AppConfigLive)));
```

### Layer Composition

```typescript
import { Context, Effect, Layer, Config } from "effect";

// Config service
class AppConfig extends Context.Tag("AppConfig")<
  AppConfig,
  { readonly logLevel: string; readonly dbUrl: string }
>() {}

const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const logLevel = yield* Config.string("LOG_LEVEL").pipe(
      Config.withDefault("info"),
    );
    const dbUrl = yield* Config.string("DATABASE_URL");
    return { logLevel, dbUrl };
  }),
);

// Logger service (depends on Config)
class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* AppConfig; // Depends on AppConfig
    return {
      log: (message) =>
        Effect.gen(function* () {
          console.log(`[${config.logLevel.toUpperCase()}] ${message}`);
        }),
    };
  }),
);

// Database service (depends on Config and Logger)
class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<unknown[]> }
>() {}

const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const logger = yield* Logger;

    return {
      query: (sql) =>
        Effect.gen(function* () {
          yield* logger.log(`Executing: ${sql}`);
          // Simulate DB query
          return [{ id: 1, name: "test" }];
        }),
    };
  }),
);

// Compose layers
// Method 1: Layer.provide (sequential - inner depends on outer)
const LoggerWithConfig = Layer.provide(LoggerLive, AppConfigLive);

// Method 2: Layer.merge (parallel - combine independent outputs)
const ConfigAndLogger = Layer.merge(AppConfigLive, LoggerLive);

// Method 3: Layer.mergeAll (merge multiple layers)
const AllServices = Layer.mergeAll(AppConfigLive, LoggerLive, DatabaseLive);

// Method 4: Build full dependency graph
const MainLayer = DatabaseLive.pipe(
  Layer.provide(LoggerLive),
  Layer.provide(AppConfigLive),
);

// Program using all services
const program = Effect.gen(function* () {
  const db = yield* Database;
  const logger = yield* Logger;

  yield* logger.log("Starting application");
  const results = yield* db.query("SELECT * FROM users");
  yield* logger.log(`Found ${results.length} users`);
});

// Run with composed layer
Effect.runPromise(program.pipe(Effect.provide(MainLayer)));
```

### Testing with Layers

```typescript
import { Context, Effect, Layer, Config, ConfigProvider } from "effect";

// Test layer with mock config provider
const TestConfigProvider = Layer.setConfigProvider(
  ConfigProvider.fromMap(
    new Map([
      ["LOG_LEVEL", "debug"],
      ["DATABASE_URL", "sqlite::memory:"],
    ]),
  ),
);

// Test layer for Logger (mock implementation)
const LoggerTest = Layer.succeed(Logger, {
  log: (message) =>
    Effect.sync(() => {
      // Collect logs for assertions instead of printing
      testLogs.push(message);
    }),
});

// Run tests with test layers
const testProgram = program.pipe(
  Effect.provide(
    Layer.mergeAll(TestConfigProvider, AppConfigLive, LoggerTest, DatabaseLive),
  ),
);
```

---

## 5. CLI + Config Integration Pattern

### Complete Integration Example

This example shows how to integrate CLI options with Effect's config system.

```typescript
import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import {
  Context,
  Effect,
  Layer,
  Config,
  ConfigProvider,
  Schema,
  Redacted,
} from "effect";

// ============================================
// 1. Define Configuration Schema
// ============================================

const AppConfigSchema = Schema.Struct({
  host: Schema.String.pipe(
    Schema.propertySignature,
    Schema.withDefault(() => "localhost"),
  ),
  port: Schema.Number.pipe(
    Schema.between(1, 65535),
    Schema.propertySignature,
    Schema.withDefault(() => 3000),
  ),
  logLevel: Schema.Literal("debug", "info", "warn", "error").pipe(
    Schema.propertySignature,
    Schema.withDefault(() => "info" as const),
  ),
  apiKey: Schema.optional(Schema.String),
});

type AppConfig = Schema.Schema.Type<typeof AppConfigSchema>;

// ============================================
// 2. Define Config Service
// ============================================

class AppConfigService extends Context.Tag("AppConfigService")<
  AppConfigService,
  AppConfig
>() {}

// Layer that loads config from Effect's Config system
const AppConfigFromEnv = Layer.effect(
  AppConfigService,
  Effect.gen(function* () {
    const host = yield* Config.string("HOST").pipe(
      Config.withDefault("localhost"),
    );
    const port = yield* Config.number("PORT").pipe(Config.withDefault(3000));
    const logLevel = yield* Config.string("LOG_LEVEL").pipe(
      Config.withDefault("info"),
    );
    const apiKey = yield* Config.string("API_KEY").pipe(Config.optional);

    return { host, port, logLevel, apiKey } as AppConfig;
  }),
);

// ============================================
// 3. Define CLI Options
// ============================================

const hostOption = Options.text("host").pipe(
  Options.withAlias("H"),
  Options.withDescription("Server host"),
  Options.optional,
);

const portOption = Options.integer("port").pipe(
  Options.withAlias("p"),
  Options.withDescription("Server port"),
  Options.optional,
);

const logLevelOption = Options.choice("log-level", [
  "debug",
  "info",
  "warn",
  "error",
] as const).pipe(
  Options.withAlias("l"),
  Options.withDescription("Log level"),
  Options.optional,
);

const configFileOption = Options.file("config").pipe(
  Options.withAlias("c"),
  Options.withDescription("Path to config file"),
  Options.optional,
);

// ============================================
// 4. Create Config Layer from CLI + File + Env
// ============================================

interface CliOptions {
  host: typeof hostOption extends Options.Options<infer A> ? A : never;
  port: typeof portOption extends Options.Options<infer A> ? A : never;
  logLevel: typeof logLevelOption extends Options.Options<infer A> ? A : never;
  configFile: typeof configFileOption extends Options.Options<infer A>
    ? A
    : never;
}

const makeConfigLayer = (cliOptions: CliOptions) =>
  Layer.effect(
    AppConfigService,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      // 1. Start with defaults
      let config: AppConfig = {
        host: "localhost",
        port: 3000,
        logLevel: "info",
        apiKey: undefined,
      };

      // 2. Load from config file if specified
      if (cliOptions.configFile._tag === "Some") {
        const fileContent = yield* fs.readFileString(
          cliOptions.configFile.value,
        );
        const fileConfig = JSON.parse(fileContent);
        config = { ...config, ...fileConfig };
      }

      // 3. Override with environment variables
      const envHost = yield* Config.string("HOST").pipe(Config.optional);
      const envPort = yield* Config.number("PORT").pipe(Config.optional);
      const envLogLevel = yield* Config.string("LOG_LEVEL").pipe(
        Config.optional,
      );
      const envApiKey = yield* Config.string("API_KEY").pipe(Config.optional);

      if (envHost._tag === "Some") config.host = envHost.value;
      if (envPort._tag === "Some") config.port = envPort.value;
      if (envLogLevel._tag === "Some")
        config.logLevel = envLogLevel.value as AppConfig["logLevel"];
      if (envApiKey._tag === "Some") config.apiKey = envApiKey.value;

      // 4. Override with CLI flags (highest priority)
      if (cliOptions.host._tag === "Some") config.host = cliOptions.host.value;
      if (cliOptions.port._tag === "Some") config.port = cliOptions.port.value;
      if (cliOptions.logLevel._tag === "Some")
        config.logLevel = cliOptions.logLevel.value;

      return config;
    }),
  );

// ============================================
// 5. Define Commands
// ============================================

const serve = Command.make(
  "serve",
  {
    host: hostOption,
    port: portOption,
    logLevel: logLevelOption,
    configFile: configFileOption,
  },
  (cliOptions) =>
    Effect.gen(function* () {
      const config = yield* AppConfigService;

      yield* Effect.log(`Starting server on ${config.host}:${config.port}`);
      yield* Effect.log(`Log level: ${config.logLevel}`);

      // Server implementation...
    }).pipe(Effect.provide(makeConfigLayer(cliOptions))),
);

const check = Command.make(
  "check",
  {
    configFile: configFileOption,
  },
  ({ configFile }) =>
    Effect.gen(function* () {
      yield* Effect.log("Checking configuration...");

      const config = yield* AppConfigService;
      yield* Effect.log(`Host: ${config.host}`);
      yield* Effect.log(`Port: ${config.port}`);
      yield* Effect.log(`Log Level: ${config.logLevel}`);
      yield* Effect.log(`API Key: ${config.apiKey ? "***" : "not set"}`);
    }).pipe(
      Effect.provide(
        makeConfigLayer({
          host: { _tag: "None" },
          port: { _tag: "None" },
          logLevel: { _tag: "None" },
          configFile,
        }),
      ),
    ),
);

const main = Command.make("myapp", {}).pipe(
  Command.withSubcommands([serve, check]),
);

// ============================================
// 6. Run CLI
// ============================================

const cli = Command.run(main, {
  name: "myapp",
  version: "1.0.0",
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
```

Usage:

```bash
# Use defaults
myapp serve

# Use config file
myapp serve --config ./myapp.json

# Override with CLI flags
myapp serve --host 0.0.0.0 --port 9000 --log-level debug

# Environment variables work too
HOST=prod.example.com PORT=443 myapp serve

# Check config resolution
myapp check --config ./myapp.json
```

---

## 6. Real-World Examples

### Effect's Own CLI Template

The Effect team maintains an official CLI template in their examples repository:

**Source**: [Effect-TS/examples - CLI Template](https://github.com/Effect-TS/examples)

Features:

- Single-file bundling with tsup
- Pre-configured for @effect/cli
- Recommended project structure

### Effect Discord Bot

The Effect team maintains a Discord bot built with Effect:

**Source**: [Effect-TS/discord-bot](https://github.com/Effect-TS/discord-bot)

Demonstrates:

- Effect service architecture
- Layer composition
- Real-world Effect patterns

### create-effect-app

The official scaffolding tool for Effect projects:

**Source**: [create-effect-app](https://effect.website/docs/getting-started/create-effect-app/)

```bash
# Create new Effect project
npx create-effect-app

# Options:
# - Basic template (single package)
# - Monorepo template (multi-package)
# - CLI template (command-line app)
```

---

## 7. Comparison with Previous Research

### vs. c12/citty (from 033-research-configuration-management.md)

| Aspect             | Effect Ecosystem         | c12/citty (UnJS)  |
| ------------------ | ------------------------ | ----------------- |
| **CLI Framework**  | @effect/cli              | citty             |
| **Config Loading** | ConfigProvider           | c12               |
| **Validation**     | Effect Schema            | Zod               |
| **Type Safety**    | Excellent (Effect types) | Good (TypeScript) |
| **DI/Services**    | Layer system             | Manual            |
| **Error Handling** | Effect errors            | Try/catch         |
| **Learning Curve** | Steep (Effect paradigm)  | Moderate          |
| **Bundle Size**    | Larger (full Effect)     | Smaller           |
| **Ecosystem**      | Effect ecosystem         | UnJS ecosystem    |

### When to Choose Effect

Choose Effect when:

- Building a larger CLI with complex service dependencies
- Already using Effect elsewhere in the application
- Type-safe error handling is critical
- Need sophisticated resource management (Scope)
- Want unified testing approach with Effect

Choose c12/citty when:

- Building a simpler CLI
- Want minimal dependencies
- Not already invested in Effect
- Prefer imperative style
- Need faster onboarding for contributors

---

## 8. Recommendations for mdcontext

### Option A: Full Effect (Recommended if committing to Effect)

Use Effect throughout the application:

```
@effect/cli        - CLI framework
@effect/platform   - File system, process execution
effect Config      - Configuration loading
effect Layer       - Dependency injection
effect Schema      - Validation
```

**Pros**:

- Unified paradigm
- Superior type safety
- Excellent composability
- Built-in resource management

**Cons**:

- Steep learning curve
- Larger bundle
- All-in commitment

### Option B: Hybrid Approach

Use Effect for core functionality, simpler tools for CLI:

```
citty              - CLI framework (lighter)
c12                - Config loading
effect             - Core business logic
zod                - Validation
```

**Pros**:

- Lower barrier to entry
- Smaller CLI bundle
- Flexibility

**Cons**:

- Mixed paradigms
- Manual integration needed

### Recommended: Start with Option A

Given that mdcontext is exploring Effect for its core functionality, using the full Effect ecosystem for CLI and config provides:

1. **Consistency**: Same patterns throughout
2. **Type Safety**: End-to-end typed effects
3. **Testing**: Unified mocking with Layers
4. **Future-Proofing**: Effect ecosystem is growing

Migration path:

1. Start with @effect/cli for command structure
2. Use Effect Config for environment/file loading
3. Build service Layers for business logic
4. Use @effect/platform for file system operations

---

## 9. Code Templates

### Minimal CLI with Config

```typescript
// src/cli.ts
import { Args, Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Config, Layer, Context } from "effect";

// Config service
class AppConfig extends Context.Tag("AppConfig")<
  AppConfig,
  {
    readonly verbose: boolean;
    readonly outputDir: string;
  }
>() {}

const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const verbose = yield* Config.boolean("VERBOSE").pipe(
      Config.withDefault(false),
    );
    const outputDir = yield* Config.string("OUTPUT_DIR").pipe(
      Config.withDefault("./dist"),
    );
    return { verbose, outputDir };
  }),
);

// CLI command
const build = Command.make(
  "build",
  {
    input: Args.file({ name: "input" }),
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.optional,
    ),
    output: Options.directory("output").pipe(
      Options.withAlias("o"),
      Options.optional,
    ),
  },
  ({ input, verbose, output }) =>
    Effect.gen(function* () {
      const config = yield* AppConfig;

      const isVerbose =
        verbose._tag === "Some" ? verbose.value : config.verbose;
      const outputDir =
        output._tag === "Some" ? output.value : config.outputDir;

      if (isVerbose) {
        yield* Effect.log(`Building ${input} to ${outputDir}`);
      }

      // Build logic...
    }).pipe(Effect.provide(AppConfigLive)),
);

const cli = Command.run(build, { name: "mybuild", version: "1.0.0" });

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
```

### Config File Support

```typescript
// src/config.ts
import { FileSystem } from "@effect/platform";
import { Effect, Config, ConfigProvider, Layer, Context, Schema } from "effect";

// Config schema
const ConfigSchema = Schema.Struct({
  logLevel: Schema.Literal("debug", "info", "warn", "error"),
  watch: Schema.Struct({
    enabled: Schema.Boolean,
    debounce: Schema.Number,
  }),
  output: Schema.Struct({
    format: Schema.Literal("json", "markdown"),
    dir: Schema.String,
  }),
});

type AppConfigType = Schema.Schema.Type<typeof ConfigSchema>;

// Load config from file + env
const loadConfigFromFile = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* fs.readFileString(path);
    const json = JSON.parse(content);
    return Schema.decodeUnknownSync(ConfigSchema)(json);
  });

// ConfigProvider that tries file first, then env
const makeConfigProvider = (configPath?: string) =>
  Effect.gen(function* () {
    if (configPath) {
      const fileConfig = yield* loadConfigFromFile(configPath);
      return ConfigProvider.fromJson(fileConfig);
    }
    return ConfigProvider.fromEnv();
  });
```

---

## References

### Official Documentation

- [Effect Documentation](https://effect.website/)
- [@effect/cli API](https://effect-ts.github.io/effect/docs/cli)
- [Effect Configuration](https://effect.website/docs/configuration/)
- [@effect/platform](https://effect.website/docs/platform/introduction/)

### GitHub

- [Effect-TS/effect](https://github.com/Effect-TS/effect)
- [Effect-TS/examples](https://github.com/Effect-TS/examples)
- [@effect/cli README](https://github.com/Effect-TS/effect/blob/main/packages/cli/README.md)
- [@effect/platform README](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md)

### NPM

- [@effect/cli](https://www.npmjs.com/package/@effect/cli)
- [@effect/platform](https://www.npmjs.com/package/@effect/platform)
- [@effect/platform-node](https://www.npmjs.com/package/@effect/platform-node)

### Community

- [Effect Discord](https://discord.gg/effect-ts)
- [Effect Solutions](https://www.effect.solutions/)
- [DeepWiki - Effect CLI Framework](https://deepwiki.com/Effect-TS/effect/8.1-cli-framework)

---

_Research completed: 2026-01-21_
