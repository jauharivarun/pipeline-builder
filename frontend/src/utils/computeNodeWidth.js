// Shared "grow width first, then wrap to new lines (height)" sizing for nodes
// with free-text entry. A node stays at MIN_WIDTH until its longest line of
// text would overflow, then it widens up to MAX_WIDTH; beyond that the
// textareas wrap and grow downward instead.
const MIN_WIDTH = 280;
const MAX_WIDTH = 480;
const CHAR_WIDTH = 7.3; // approx px per character at the field font size
const CHROME = 54;      // node body + textarea horizontal padding/border

export const computeNodeWidth = (texts = [], opts = {}) => {
  const {
    min = MIN_WIDTH,
    max = MAX_WIDTH,
    charWidth = CHAR_WIDTH,
    chrome = CHROME,
  } = opts;

  const longestLine = texts
    .filter((t) => t != null && t !== '')
    .flatMap((t) => String(t).split('\n'))
    .reduce((longest, line) => Math.max(longest, line.length), 0);

  const desired = longestLine * charWidth + chrome;
  return Math.round(Math.max(min, Math.min(max, desired)));
};
