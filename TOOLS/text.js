// ==========================================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
// ==========================================

export const text = () => {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  console.log("- - - TEXT - - -");

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
};

if (process.argv[1] === import.meta.filename) text();
