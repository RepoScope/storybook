import os from 'node:os';
import path from 'node:path';

export interface IErrorWithStdErrAndStdOut {
  stderr?: Buffer | string;
  stdout?: Buffer | string;
  [key: string]: unknown;
}

// Removes all user paths
function regexpEscape(str: string): string {
  return str.replace(/[-[/{}()*+?.\\^$|]/g, `\\$&`);
}

export function removeAnsiEscapeCodes(input = ''): string {
  return input.replace(/\u001B\[[0-9;]*m/g, '');
}

export function cleanPaths(str: string, separator: string = path.sep): string {
  if (!str) {
    return str;
  }

  const separators = Array.from(new Set([separator, `/`, `\\`]));
  const basePaths = [process.cwd(), os.homedir()].filter(Boolean);

  const targets = basePaths.flatMap((basePath) =>
    separators.map((sep) => ({
      separator: sep,
      normalizedPath: basePath.split(/[\\/]/).join(sep),
    }))
  );

  targets.forEach(({ separator: sep, normalizedPath }) => {
    const stack = normalizedPath.split(sep);

    while (stack.length > 1) {
      const currentPath = stack.join(sep);
      const currentRegex = new RegExp(regexpEscape(currentPath), `gi`);
      str = str.replace(currentRegex, `$SNIP`);

      const doubledSeparatorPath = stack.join(sep + sep);
      const doubledSeparatorRegex = new RegExp(regexpEscape(doubledSeparatorPath), `gi`);
      str = str.replace(doubledSeparatorRegex, `$SNIP`);

      stack.pop();
    }
  });

  return str;
}

// Takes an Error and returns a sanitized JSON String
export function sanitizeError(error: Error, pathSeparator: string = path.sep) {
  try {
    error = {
      ...JSON.parse(JSON.stringify(error)),
      message: removeAnsiEscapeCodes(error.message),
      stack: removeAnsiEscapeCodes(error.stack),
      cause: error.cause,
      name: error.name,
    };

    // Removes all user paths
    const errorString = cleanPaths(JSON.stringify(error), pathSeparator);

    return JSON.parse(errorString);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return `Sanitization error: ${message}`;
  }
}
