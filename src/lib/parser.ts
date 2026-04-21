export function extractBetweenTags(
  tag: string,
  text: string,
  strip = false,
): string[] {
  const regex = new RegExp(`<${tag}>([\\s\\S]+?)</${tag}>`, "g");
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(strip ? match[1].trim() : match[1]);
  }
  return matches;
}

export function removeEmptyTags(text: string): string {
  return text.replace(/<(\w+)><\/\1>$/, "");
}

export function extractPrompt(metapromptResponse: string): string {
  const betweenTags = extractBetweenTags("Instructions", metapromptResponse);
  if (betweenTags.length === 0) {
    throw new Error("No <Instructions> tags found in response");
  }
  return removeEmptyTags(removeEmptyTags(betweenTags[0]).trim()).trim();
}

export function extractVariables(prompt: string): Set<string> {
  const pattern = /\{([^}]+)\}/g;
  const variables = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(prompt)) !== null) {
    variables.add(match[1]);
  }
  return variables;
}
