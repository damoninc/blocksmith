export function forgeBuildsForMinecraft(
  metadataXml: string,
  minecraftVersion: string,
): string[] {
  const prefix = `${minecraftVersion}-`;
  const builds: string[] = [];
  const seen = new Set<string>();
  const xml = metadataXml.replace(
    /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/g,
    "",
  );

  for (const section of xml.matchAll(/<versions\b[^>]*>([\s\S]*?)<\/versions\s*>/g)) {
    for (const versionText of directVersionTexts(section[1])) {
      const version = decodeXmlText(versionText.trim());
      if (!version.startsWith(prefix)) continue;

      const build = version.slice(prefix.length).trim();
      if (!build || seen.has(build)) continue;

      seen.add(build);
      builds.push(build);
    }
  }

  return builds.sort(compareBuildsDescending);
}

function directVersionTexts(versionsXml: string): string[] {
  const texts: string[] = [];
  const stack: string[] = [];
  const tags = /<\s*(\/?)\s*([A-Za-z_][\w:.-]*)([^>]*)>/g;
  let active: { start: number; valid: boolean } | undefined;

  for (const tag of versionsXml.matchAll(tags)) {
    const closing = tag[1] === "/";
    const name = tag[2];
    const selfClosing = !closing && /\/\s*$/.test(tag[3]);

    if (closing) {
      const matchingIndex = stack.lastIndexOf(name);
      if (name === "version" && active && matchingIndex === stack.length - 1) {
        const text = versionsXml.slice(active.start, tag.index);
        if (active.valid && !/[<>]/.test(text)) texts.push(text);
      }

      if (matchingIndex >= 0) stack.splice(matchingIndex);
      if (active && !stack.includes("version")) active = undefined;
      continue;
    }

    if (active) active.valid = false;
    if (name === "version" && stack.length === 0 && !selfClosing) {
      active = { start: tag.index + tag[0].length, valid: true };
    }
    if (!selfClosing) stack.push(name);
  }

  return texts;
}

function decodeXmlText(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g,
    (entity) => {
      const named: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
      };
      if (entity in named) return named[entity];

      const hexadecimal = entity.startsWith("&#x");
      const codePoint = Number.parseInt(entity.slice(hexadecimal ? 3 : 2, -1), hexadecimal ? 16 : 10);
      if (
        codePoint <= 0
        || codePoint > 0x10ffff
        || (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return entity;
      }
      return String.fromCodePoint(codePoint);
    },
  );
}

function compareBuildsDescending(left: string, right: string): number {
  const leftParts = left.match(/\d+|\D+/g) ?? [];
  const rightParts = right.match(/\d+|\D+/g) ?? [];

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === undefined) return 1;
    if (rightPart === undefined) return -1;
    if (leftPart === rightPart) continue;

    if (/^\d+$/.test(leftPart) && /^\d+$/.test(rightPart)) {
      const leftNumber = BigInt(leftPart);
      const rightNumber = BigInt(rightPart);
      if (leftNumber !== rightNumber) return leftNumber > rightNumber ? -1 : 1;
    }

    return leftPart > rightPart ? -1 : 1;
  }

  return 0;
}
