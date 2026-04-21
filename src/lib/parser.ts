/**
 * Extract content between XML-style tags.
 * Tag name is sanitized to prevent regex injection.
 */
export function extractBetweenTags(
  tag: string,
  text: string,
  strip = false,
): string[] {
  // Sanitize tag name: only allow word characters to prevent regex injection
  const safeTag = tag.replace(/[^\w]/g, "");
  if (!safeTag) return [];

  const regex = new RegExp(`<${safeTag}>([\\s\\S]+?)</${safeTag}>`, "g");
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(strip ? match[1].trim() : match[1]);
  }
  return matches;
}

/**
 * Remove empty XML tags from the end of text.
 * Uses global flag to remove ALL trailing empty tags, not just one.
 */
export function removeEmptyTags(text: string): string {
  // Repeatedly remove empty tags until stable (handles nested empty tags)
  let result = text;
  let prev: string;
  do {
    prev = result;
    result = result.replace(/<(\w+)><\/\1>/g, "");
  } while (result !== prev);
  return result;
}

/**
 * Extract the prompt template from the metaprompt response.
 * Gets content between <Instructions> tags and cleans empty trailing tags.
 */
export function extractPrompt(metapromptResponse: string): string {
  const betweenTags = extractBetweenTags("Instructions", metapromptResponse);
  if (betweenTags.length === 0) {
    throw new Error("No <Instructions> tags found in response");
  }
  return removeEmptyTags(betweenTags[0].trim()).trim();
}

/**
 * Extract variable placeholders from a prompt template.
 * Finds {VAR_NAME} patterns, filtering out empty or overly long matches.
 * Excludes {{$VAR}} patterns (those are the metaprompt's own format).
 */
export function extractVariables(prompt: string): Set<string> {
  const variables = new Set<string>();
  // Match {VAR} but NOT {$VAR} (metaprompt internal format)
  const pattern = /(?<!\$)\{([^}$][^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(prompt)) !== null) {
    const name = match[1].trim();
    // Filter: non-empty, reasonable length, word characters only
    if (name && name.length <= 64 && /^[A-Za-z0-9_]+$/.test(name)) {
      variables.add(name);
    }
  }
  return variables;
}
