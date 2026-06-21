import { useEffect, useCallback, useMemo } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy, { type Instance } from "tippy.js";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Link as LinkIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { useStore } from "../store";
import {
  SlashCommandMenu,
  SLASH_COMMANDS,
  type SlashMenuHandle,
} from "./SlashCommandMenu";
import { codeBlockExtension } from "../extensions/codeBlockLowlight";

/* ── Slash Command Extension ─────────────────────── */
function buildSlashExtension() {
  return Extension.create({
    name: "slashCommands",
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          startOfLine: false,
          command: ({ editor, range, props }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (props as any).command({ editor, range });
          },
          items: ({ query }: { query: string }) => {
            const q = query.toLowerCase();
            return q
              ? SLASH_COMMANDS.filter(
                  (c) =>
                    c.title.toLowerCase().includes(q) ||
                    c.description.toLowerCase().includes(q)
                )
              : SLASH_COMMANDS;
          },
          render: () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let component: ReactRenderer<SlashMenuHandle, any>;
            let popup: Instance[];

            return {
              onStart(props) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                component = new ReactRenderer<SlashMenuHandle, any>(
                  SlashCommandMenu as any,
                  { props, editor: props.editor }
                );

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  animation: "shift-away",
                  duration: [120, 80],
                });
              },

              onUpdate(props) {
                component.updateProps(props);
                if (!props.clientRect) return;
                popup[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },

              onKeyDown(props) {
                if (props.event.key === "Escape") {
                  popup[0]?.hide();
                  return true;
                }
                return (
                  (component.ref as SlashMenuHandle | null)?.onKeyDown(
                    props
                  ) ?? false
                );
              },

              onExit() {
                popup[0]?.destroy();
                component.destroy();
              },
            };
          },
        }),
      ];
    },
  });
}

/* ── Bubble Menu Button ──────────────────────────── */
function BubbleBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={clsx("bubble-btn", active && "active")}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
    >
      {children}
    </button>
  );
}

/* ── Editor Component ────────────────────────────── */
interface EditorProps {
  pageId: string;
  initialContent: string;
}

export function Editor({ pageId, initialContent }: EditorProps) {
  const { scheduleContentSave } = useStore();

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
        codeBlock: false,
      }),
      codeBlockExtension,
      Placeholder.configure({
        placeholder: "Start writing, or type '/' for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Color,
      TextStyle,
      Highlight,
      buildSlashExtension(),
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: initialContent || "",
    onUpdate: ({ editor }) => {
      scheduleContentSave(pageId, editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        spellcheck: "true",
      },
    },
  });

  /* Re-load content when the page changes */
  useEffect(() => {
    if (editor && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent || "", {
        emitUpdate: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, initialContent, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Bubble menu shown on text selection */}
      <BubbleMenu editor={editor}>
        <div className="bubble-menu">
          <BubbleBtn
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (⌘B)"
          >
            <Bold size={13} />
          </BubbleBtn>
          <BubbleBtn
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (⌘I)"
          >
            <Italic size={13} />
          </BubbleBtn>
          <BubbleBtn
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (⌘U)"
          >
            <UnderlineIcon size={13} />
          </BubbleBtn>
          <BubbleBtn
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough size={13} />
          </BubbleBtn>
          <BubbleBtn
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            <Code size={13} />
          </BubbleBtn>
          <BubbleBtn
            active={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="Highlight"
          >
            <Highlighter size={13} />
          </BubbleBtn>
          <div className="bubble-divider" />
          <BubbleBtn
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="Align left"
          >
            <AlignLeft size={13} />
          </BubbleBtn>
          <BubbleBtn
            active={editor.isActive({ textAlign: "center" })}
            onClick={() =>
              editor.chain().focus().setTextAlign("center").run()
            }
            title="Align center"
          >
            <AlignCenter size={13} />
          </BubbleBtn>
          <BubbleBtn
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="Align right"
          >
            <AlignRight size={13} />
          </BubbleBtn>
          <div className="bubble-divider" />
          <BubbleBtn
            active={editor.isActive("link")}
            onClick={setLink}
            title="Link"
          >
            <LinkIcon size={13} />
          </BubbleBtn>
        </div>
      </BubbleMenu>

      {/* Editor content */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}
