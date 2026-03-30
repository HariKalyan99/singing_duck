function trimSnippet(snippet, visibleContext = 5) {
  if (!snippet || snippet.length === 0) return snippet;

  const errorIndex = snippet.findIndex((line) => line.isErrorLine);

  if (errorIndex === -1) return snippet;

  const start = Math.max(0, errorIndex - visibleContext);
  const end = Math.min(snippet.length, errorIndex + visibleContext + 1);

  return snippet.slice(start, end);
}

export default trimSnippet;
