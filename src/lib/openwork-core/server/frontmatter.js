import { parse, stringify } from "yaml";
export function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) {
        return { data: {}, body: content };
    }
    const raw = match[1] ?? "";
    const body = content.slice(match[0].length);
    // Malformed YAML throws (callers like listSkills catch it to surface a
    // visible per-item error); non-mapping YAML normalizes to an empty record.
    const parsed = parse(raw);
    const data = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? Object.fromEntries(Object.entries(parsed))
        : {};
    return { data, body };
}
export function buildFrontmatter(data) {
    const yaml = stringify(data).trimEnd();
    return `---\n${yaml}\n---\n`;
}
