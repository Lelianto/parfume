"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { FontSize } from "@/lib/tiptap-font-size";

/* ── Custom SVG toolbar icons (16×16) ── */
const s = 16;

const IconBold = () => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2.5h5a3.25 3.25 0 0 1 0 5.5H4V2.5Z" />
    <path d="M4 8h5.5a3.25 3.25 0 0 1 0 5.5H4V8Z" />
  </svg>
);

const IconItalic = () => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10.5" y1="2.5" x2="5.5" y2="13.5" />
    <line x1="6" y1="2.5" x2="11" y2="2.5" />
    <line x1="5" y1="13.5" x2="10" y2="13.5" />
  </svg>
);

const IconTextLg = () => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h10M8 3v10M5.5 13h5" />
  </svg>
);

const IconTextSm = () => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5h6M8 5v7M6.5 12h3" />
  </svg>
);

const IconBulletList = () => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="4" x2="14" y2="4" />
    <line x1="6" y1="8" x2="14" y2="8" />
    <line x1="6" y1="12" x2="14" y2="12" />
    <circle cx="2.5" cy="4" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="2.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="2.5" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

const IconOrderedList = () => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="4" x2="14" y2="4" />
    <line x1="6" y1="8" x2="14" y2="8" />
    <line x1="6" y1="12" x2="14" y2="12" />
    <text x="1.5" y="5.5" fill="currentColor" stroke="none" fontSize="4.5" fontWeight="600" fontFamily="sans-serif">1</text>
    <text x="1.5" y="9.5" fill="currentColor" stroke="none" fontSize="4.5" fontWeight="600" fontFamily="sans-serif">2</text>
    <text x="1.5" y="13.5" fill="currentColor" stroke="none" fontSize="4.5" fontWeight="600" fontFamily="sans-serif">3</text>
  </svg>
);

const IconLink = () => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
    <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
  </svg>
);

const IconUnlink = () => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 9a3.5 3.5 0 0 0 4.5.5l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
    <path d="M9 7a3.5 3.5 0 0 0-4.5-.5l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
    <line x1="2" y1="2" x2="14" y2="14" />
  </svg>
);

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      TextStyle,
      FontSize,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const toggleFontSize = (size: string) => {
    if (editor.isActive("textStyle", { fontSize: size })) {
      editor.chain().focus().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
    } else {
      editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
    }
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const btn =
    "rounded-lg p-1.5 text-gold-200/50 transition-colors hover:text-gold-300";
  const active = "!text-gold-400 bg-gold-900/40";

  return (
    <div className="tiptap-editor mt-1 rounded-xl border border-gold-900/50 bg-surface-200 transition-[border-color,box-shadow] duration-300 focus-within:border-gold-400/50 focus-within:shadow-[0_0_0_3px_rgba(201,169,110,0.08)]">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-gold-900/30 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${btn} ${editor.isActive("bold") ? active : ""}`}
          title="Bold"
        >
          <IconBold />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${btn} ${editor.isActive("italic") ? active : ""}`}
          title="Italic"
        >
          <IconItalic />
        </button>
        <button
          type="button"
          onClick={() => toggleFontSize("1.125rem")}
          className={`${btn} ${editor.isActive("textStyle", { fontSize: "1.125rem" }) ? active : ""}`}
          title="Teks Besar"
        >
          <IconTextLg />
        </button>
        <button
          type="button"
          onClick={() => toggleFontSize("0.75rem")}
          className={`${btn} ${editor.isActive("textStyle", { fontSize: "0.75rem" }) ? active : ""}`}
          title="Teks Kecil"
        >
          <IconTextSm />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${btn} ${editor.isActive("bulletList") ? active : ""}`}
          title="Bullet List"
        >
          <IconBulletList />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${btn} ${editor.isActive("orderedList") ? active : ""}`}
          title="Ordered List"
        >
          <IconOrderedList />
        </button>
        <button
          type="button"
          onClick={setLink}
          className={`${btn} ${editor.isActive("link") ? active : ""}`}
          title="Add Link"
        >
          <IconLink />
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className={btn}
            title="Remove Link"
          >
            <IconUnlink />
          </button>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}
