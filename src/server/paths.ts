import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Absolute path of the built UI bundle directory, resolved relative to a module
 * inside dist/server. Given dist/server/index.js, returns dist/ui.
 * @param serverModuleUrl a file: URL (typically import.meta.url)
 * @throws TypeError if serverModuleUrl is not a file: URL
 */
export function uiDistDir(serverModuleUrl: string): string {
  const modulePath = fileURLToPath(serverModuleUrl);
  const moduleDir = path.dirname(modulePath);
  return path.resolve(moduleDir, '..', 'ui');
}
