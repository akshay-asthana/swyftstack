"use client";

// TipTap editor for the CMS. Renders a small toolbar + the editor area,
// uploads pasted/inserted images through the platform-bucket upload API,
// and serialises the doc into JSON for storage in cms_marketing_pages.
//
// The hidden inputs `content_json` and `content_html` are submitted along
// with the surrounding form action so the editor plugs into existing
// admin form patterns (no custom fetch needed).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

interface Props {
  name?: string;
  defaultJson?: unknown;
  defaultHtml?: string;
  placeholder?: string;
  /** Posting endpoint for uploads — defaults to /api/cms/upload */
  uploadEndpoint?: string;
}

function defaultContent(json: unknown, html: string | undefined): string | object {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const candidate = json as Record<string, unknown>;
    if (candidate.type === "doc" || Object.keys(candidate).length > 0) return candidate;
  }
  if (html) return html;
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function CmsEditor({
  defaultJson,
  defaultHtml,
  placeholder = "Write your post…",
  uploadEndpoint = "/api/cms/upload",
}: Props) {
  const [contentJson, setContentJson] = useState<string>(() =>
    JSON.stringify(defaultJson ?? { type: "doc", content: [{ type: "paragraph" }] }),
  );
  const [contentHtml, setContentHtml] = useState<string>(defaultHtml ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const initial = useMemo(() => defaultContent(defaultJson, defaultHtml), [defaultJson, defaultHtml]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: initial,
    immediatelyRender: false,
    onUpdate({ editor: e }) {
      setContentJson(JSON.stringify(e.getJSON()));
      setContentHtml(e.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    setContentJson(JSON.stringify(editor.getJSON()));
    setContentHtml(editor.getHTML());
  }, [editor]);

  const uploadImage = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(uploadEndpoint, { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
        const { url } = (await res.json()) as { url: string };
        editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setUploading(false);
      }
    },
    [editor, uploadEndpoint],
  );

  const onImageInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (file) void uploadImage(file);
    if (fileInput.current) fileInput.current.value = "";
  };

  if (!editor) return <p className="small">Loading editor…</p>;

  return (
    <div className="cms-editor">
      <div className="cms-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} aria-pressed={editor.isActive("bold")}>B</button>
        <button type="button" style={{ fontStyle: "italic" }} onClick={() => editor.chain().focus().toggleItalic().run()} aria-pressed={editor.isActive("italic")}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} aria-pressed={editor.isActive("code")}>{"</>"}</button>
        <span className="cms-tb-sep" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-pressed={editor.isActive("heading", { level: 2 })}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-pressed={editor.isActive("heading", { level: 3 })}>H3</button>
        <span className="cms-tb-sep" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-pressed={editor.isActive("bulletList")}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-pressed={editor.isActive("orderedList")}>1. List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-pressed={editor.isActive("blockquote")}>&quot; Quote</button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-pressed={editor.isActive("codeBlock")}>Code block</button>
        <span className="cms-tb-sep" />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url == null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          aria-pressed={editor.isActive("link")}
        >
          🔗 Link
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "🖼 Image"}
        </button>
        <span className="cms-tb-sep" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()}>Undo</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()}>Redo</button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={onImageInput}
        style={{ display: "none" }}
      />
      {error && <div className="err" style={{ marginTop: 8 }}>{error}</div>}
      <EditorContent editor={editor} className="cms-content" />
      <input type="hidden" name="content_json" value={contentJson} />
      <input type="hidden" name="content_html" value={contentHtml} />
    </div>
  );
}
