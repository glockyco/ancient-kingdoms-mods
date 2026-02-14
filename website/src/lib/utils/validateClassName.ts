/**
 * Validates that a class name is in lowercase (canonical form).
 * Throws an error if uppercase characters are detected.
 *
 * @param name - Class name to validate
 * @returns The validated class name (lowercase)
 * @throws Error if the name contains uppercase characters
 */
export function validateClassName(name: string): string {
  if (name !== name.toLowerCase()) {
    throw new Error(
      `Class name must be lowercase (canonical form): got "${name}", expected "${name.toLowerCase()}"`,
    );
  }
  return name;
}
