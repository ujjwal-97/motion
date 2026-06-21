import { useMemo } from "react";
import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { detectLanguage, SUPPORTED_LANGUAGES } from "../lib/lowlight";

export function CodeBlockView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const language = node.attrs.language as string | null;
  const text = node.textContent;

  const detectedLanguage = useMemo(
    () => (language ? null : detectLanguage(text)),
    [language, text]
  );

  const displayLabel = language ?? detectedLanguage ?? "plaintext";

  return (
    <NodeViewWrapper
      as="div"
      className="code-block-wrapper"
      data-selected={selected ? "true" : "false"}
    >
      <div
        className="code-block-header"
        contentEditable={false}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <label className="code-block-lang-label">
          <span className="code-block-lang-name">{displayLabel}</span>
          <select
            className="code-block-lang-select"
            value={language ?? "auto"}
            onChange={(event) => {
              const value = event.target.value;
              updateAttributes({ language: value === "auto" ? null : value });
            }}
            aria-label="Code language"
          >
            <option value="auto">Auto-detect</option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
