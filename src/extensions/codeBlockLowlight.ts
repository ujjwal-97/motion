import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CodeBlockView } from "../components/CodeBlockView";
import { lowlight } from "../lib/lowlight";

export const codeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  enableTabIndentation: true,
  tabSize: 2,
});
