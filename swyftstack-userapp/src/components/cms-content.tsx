// Render TipTap content_json or content_html with sane fallback. Server
// component — content is already sanitised at publish time (we trust the
// admin author).
import React from "react";

type CmsPage = {
  contentJson: unknown;
  contentHtml: string | null;
  excerpt: string | null;
};

/** Walk a TipTap doc node and turn it into React elements. Only handles the
 *  subset of nodes we use: doc, paragraph, heading, bullet/orderedList,
 *  listItem, blockquote, image, hardBreak, codeBlock, plus text marks
 *  (bold, italic, code, link). Unknown nodes render as their text content. */
function renderNode(node: unknown, key: number): React.ReactNode {
  if (typeof node !== "object" || node === null) return null;
  const n = node as { type?: string; text?: string; content?: unknown[]; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[] };
  if (n.type === "text") {
    let el: React.ReactNode = n.text ?? "";
    for (const mark of n.marks ?? []) {
      if (mark.type === "bold") el = <strong key={key}>{el}</strong>;
      else if (mark.type === "italic") el = <em key={key}>{el}</em>;
      else if (mark.type === "code") el = <code key={key}>{el}</code>;
      else if (mark.type === "link") {
        const href = String(mark.attrs?.href ?? "#");
        el = <a key={key} href={href} target={mark.attrs?.target ? String(mark.attrs.target) : undefined}>{el}</a>;
      }
    }
    return el;
  }
  const children = (n.content ?? []).map((c, i) => renderNode(c, i));
  switch (n.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(n.attrs?.level ?? 2)));
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag key={key}>{children}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return <pre key={key}><code>{children}</code></pre>;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const src = String(n.attrs?.src ?? "");
      const alt = String(n.attrs?.alt ?? "");
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={key} src={src} alt={alt} loading="lazy" />;
    }
    case "horizontalRule":
      return <hr key={key} />;
    default:
      return <span key={key}>{children}</span>;
  }
}

export function renderCmsContent(page: CmsPage): React.ReactNode {
  if (page.contentJson && typeof page.contentJson === "object") {
    return renderNode(page.contentJson, 0);
  }
  if (page.contentHtml) {
    return <div dangerouslySetInnerHTML={{ __html: page.contentHtml }} />;
  }
  if (page.excerpt) return <p>{page.excerpt}</p>;
  return null;
}
