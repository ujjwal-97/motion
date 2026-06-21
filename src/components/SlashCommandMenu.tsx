import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { clsx } from "clsx";
import type { Editor, Range } from "@tiptap/core";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (opts: { editor: Editor; range: Range }) => void;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: "Text",
    description: "Start writing with plain text",
    icon: "¶",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 1 })
        .run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 2 })
        .run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "H3",
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 3 })
        .run(),
  },
  {
    title: "Bullet List",
    description: "Create a simple bulleted list",
    icon: "•",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: "1.",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "To-do List",
    description: "Track tasks with checkboxes",
    icon: "☑",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    description: "Capture a quote or callout",
    icon: "❝",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: "Code Block",
    description: "Syntax-highlighted code with auto language detection",
    icon: "<>",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Visually separate sections",
    icon: "—",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

export interface SlashMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface Props {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandMenu = forwardRef<SlashMenuHandle, Props>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) =>
            i === 0 ? items.length - 1 : i - 1
          );
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selectedIndex]) {
            command(items[selectedIndex]);
          }
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="slash-menu">
          <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">
            No results
          </div>
        </div>
      );
    }

    return (
      <div className="slash-menu">
        <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-widest text-[var(--text-secondary)] uppercase">
          Blocks
        </div>
        {items.map((item, index) => (
          <button
            key={item.title}
            className={clsx(
              "slash-menu-item",
              index === selectedIndex && "active"
            )}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => command(item)}
          >
            <div className="item-icon">
              <span className="font-mono text-xs">{item.icon}</span>
            </div>
            <div>
              <div className="item-title">{item.title}</div>
              <div className="item-desc">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

SlashCommandMenu.displayName = "SlashCommandMenu";
