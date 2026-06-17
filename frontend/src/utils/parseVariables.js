const VAR_REGEX = /{{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*}}/g;

/**
 * Extract unique variable names from a template string.
 * "Hello {{name}}, order {{id}} for {{name}}" → ['name', 'id']
 */
export const parseVariables = (text = '') => {
  const found = [];
  const seen = new Set();
  let match;

  VAR_REGEX.lastIndex = 0;
  while ((match = VAR_REGEX.exec(text)) !== null) {
    const varName = match[1];
    if (!seen.has(varName)) {
      seen.add(varName);
      found.push(varName);
    }
  }

  return found;
};
