import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { maskDocx } from "./docx";

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

function paragraph(...runs: string[]): string {
  const body = runs
    .map((run) => `<w:r><w:t xml:space="preserve">${run}</w:t></w:r>`)
    .join("");
  return `<w:p>${body}</w:p>`;
}

function cell(text: string): string {
  return `<w:tc>${paragraph(text)}</w:tc>`;
}

function row(...cells: string[]): string {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function build(parts: Record<string, string>): File {
  const entries: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8("<Types/>"),
  };
  for (const [path, xml] of Object.entries(parts)) {
    entries[path] = strToU8(xml);
  }
  const zipped = zipSync(entries);
  return new File([zipped as BlobPart], "profile.docx");
}

function document(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}</w:body></w:document>`;
}

async function read(file: File, part: string): Promise<string> {
  const blob = await maskDocx(file);
  const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  return strFromU8(archive[part]);
}

function textOf(xml: string): string {
  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((match) => match[1])
    .join("");
}

describe("maskDocx", () => {
  it("склеивает разорванные Word фрагменты перед заменой", async () => {
    const file = build({
      "word/document.xml": document(paragraph("ИИН", ": 9901", "01300122")),
    });

    expect(textOf(await read(file, "word/document.xml"))).toBe("ИИН: ************");
  });

  it("маскирует значение по метке в соседней ячейке таблицы", async () => {
    const file = build({
      "word/document.xml": document(
        row(cell("Дата рождения"), cell("14.03.1992")) +
          row(cell("Примечание"), cell("оплата в срок")),
      ),
    });

    expect(textOf(await read(file, "word/document.xml"))).toBe(
      "Дата рождения**********Примечаниеоплата в срок",
    );
  });

  it("обрабатывает колонтитулы", async () => {
    const file = build({
      "word/document.xml": document(paragraph("Пусто")),
      "word/header1.xml": `<?xml version="1.0"?><w:hdr ${NS}>${paragraph(
        "Email: ivan@mail.kz",
      )}</w:hdr>`,
    });

    expect(textOf(await read(file, "word/header1.xml"))).toBe("Email: ************");
  });

  it("вычищает автора из свойств документа", async () => {
    const core = `<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Тансикбаев Тимур</dc:creator><cp:lastModifiedBy>Sadykov Timur</cp:lastModifiedBy></cp:coreProperties>`;
    const file = build({
      "word/document.xml": document(paragraph("Пусто")),
      "docProps/core.xml": core,
    });

    const xml = await read(file, "docProps/core.xml");
    expect(xml).toContain("<dc:creator>********** *****</dc:creator>");
    expect(xml).toContain("<cp:lastModifiedBy>******* *****</cp:lastModifiedBy>");
  });

  it("сохраняет разметку и прочие части архива", async () => {
    const file = build({
      "word/document.xml": document(paragraph("Телефон: +7 701 123 45 67")),
    });

    const blob = await maskDocx(file);
    const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const xml = strFromU8(archive["word/document.xml"]);

    expect(Object.keys(archive)).toContain("[Content_Types].xml");
    expect(xml).toContain('<w:r><w:t xml:space="preserve">');
    expect(xml).toContain("Телефон: ** *** *** ** **");
  });

  it("отказывается обрабатывать архив без document.xml", async () => {
    const file = build({ "word/other.xml": "<x/>" });

    await expect(maskDocx(file)).rejects.toThrow();
  });
});
