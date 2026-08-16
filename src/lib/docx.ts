import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { isSensitiveLabel, maskAll, maskSensitive } from "./redact";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const TEXT_PARTS =
  /^word\/(?:document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;
const META_PARTS = new Set(["docProps/core.xml", "docProps/app.xml"]);
const META_TAGS = ["dc:creator", "cp:lastModifiedBy", "Company", "Manager"];

function decodeXml(value: string): string {
  return value.replace(/&(#x?[\dA-Fa-f]+|amp|lt|gt|quot|apos);/g, (whole, code: string) => {
    if (code === "amp") return "&";
    if (code === "lt") return "<";
    if (code === "gt") return ">";
    if (code === "quot") return '"';
    if (code === "apos") return "'";
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(parseInt(code.slice(2), 16));
    }
    if (code.startsWith("#")) return String.fromCodePoint(Number(code.slice(1)));
    return whole;
  });
}

function encodeXml(value: string): string {
  return value.replace(/[&<>]/g, (ch) =>
    ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : "&gt;",
  );
}

type TextNode = { start: number; end: number; raw: string };

type Layout = {
  nodes: TextNode[];
  paragraphs: number[][];
  rows: number[][][];
};

function readLayout(xml: string): Layout {
  const re =
    /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<\/w:p>|<w:tr(?:\s[^>]*)?>|<\/w:tr>|<w:tc(?:\s[^>]*)?>|<\/w:tc>/g;

  const nodes: TextNode[] = [];
  const paragraphs: number[][] = [];
  const rows: number[][][] = [];

  let paragraph: number[] = [];
  const rowStack: number[][][] = [];
  const cellStack: number[][] = [];
  let token: RegExpExecArray | null;

  while ((token = re.exec(xml)) !== null) {
    const tag = token[0];

    if (token[1] !== undefined) {
      const raw = token[1];
      const start = token.index + tag.length - raw.length - "</w:t>".length;
      const index = nodes.length;
      nodes.push({ start, end: start + raw.length, raw });
      paragraph.push(index);
      cellStack[cellStack.length - 1]?.push(index);
      continue;
    }

    if (tag === "</w:p>") {
      if (paragraph.length) paragraphs.push(paragraph);
      paragraph = [];
    } else if (tag.startsWith("<w:tr")) {
      rowStack.push([]);
    } else if (tag === "</w:tr>") {
      const row = rowStack.pop();
      if (row?.length) rows.push(row);
    } else if (tag.startsWith("<w:tc")) {
      cellStack.push([]);
    } else if (tag === "</w:tc>") {
      const cell = cellStack.pop();
      if (cell) rowStack[rowStack.length - 1]?.push(cell);
    }
  }

  if (paragraph.length) paragraphs.push(paragraph);
  return { nodes, paragraphs, rows };
}

function maskPart(xml: string): string {
  const { nodes, paragraphs, rows } = readLayout(xml);
  if (!nodes.length) return xml;

  const values = nodes.map((node) => decodeXml(node.raw));
  const join = (indexes: number[]) => indexes.map((i) => values[i]).join("");

  for (const indexes of paragraphs) {
    const text = join(indexes);
    if (!text.trim()) continue;

    const masked = maskSensitive(text);
    if (masked === text) continue;

    let cursor = 0;
    for (const i of indexes) {
      const length = values[i].length;
      values[i] = masked.slice(cursor, cursor + length);
      cursor += length;
    }
  }

  for (const cells of rows) {
    if (cells.length < 2) continue;
    if (!isSensitiveLabel(join(cells[0]))) continue;

    for (const cell of cells.slice(1)) {
      for (const i of cell) values[i] = maskAll(values[i]);
    }
  }

  let out = "";
  let last = 0;
  nodes.forEach((node, i) => {
    const encoded = encodeXml(values[i]);
    if (encoded === node.raw) return;
    out += xml.slice(last, node.start) + encoded;
    last = node.end;
  });

  return last === 0 ? xml : out + xml.slice(last);
}

function maskMeta(xml: string): string {
  return META_TAGS.reduce((acc, tag) => {
    const re = new RegExp(`(<${tag}(?:\\s[^>]*)?>)([\\s\\S]*?)(</${tag}>)`, "g");
    return acc.replace(re, (_, open: string, body: string, close: string) => {
      return open + encodeXml(maskAll(decodeXml(body))) + close;
    });
  }, xml);
}

export async function maskDocx(file: File): Promise<Blob> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  if (!archive["word/document.xml"]) {
    throw new Error("Файл не похож на документ Word");
  }

  for (const [path, data] of Object.entries(archive)) {
    if (TEXT_PARTS.test(path)) {
      archive[path] = strToU8(maskPart(strFromU8(data)));
    } else if (META_PARTS.has(path)) {
      archive[path] = strToU8(maskMeta(strFromU8(data)));
    }
  }

  return new Blob([zipSync(archive, { level: 6 })], { type: DOCX_MIME });
}
