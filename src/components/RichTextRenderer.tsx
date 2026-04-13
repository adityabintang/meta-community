import React from "react";

type LexicalNode = {
  type?: string;
  tag?: string;
  text?: string;
  format?: number;
  fields?: {
    url?: string;
    newTab?: boolean;
  };
  children?: LexicalNode[];
};

type LexicalDocument = {
  root?: {
    children?: LexicalNode[];
  };
};

type RichTextRendererProps = {
  content?: unknown;
  className?: string;
};

function applyTextFormat(text: string, format?: number): React.ReactNode {
  if (!format || !text) return text;

  let node: React.ReactNode = text;

  if (format & 1) node = <strong>{node}</strong>;
  if (format & 2) node = <em>{node}</em>;
  if (format & 4) node = <s>{node}</s>;
  if (format & 8) node = <u>{node}</u>;
  if (format & 16) node = <code className="px-1 py-0.5 rounded bg-secondary text-sm">{node}</code>;

  return node;
}

function renderInline(nodes: LexicalNode[] | undefined, keyPrefix: string): React.ReactNode {
  if (!Array.isArray(nodes)) return null;

  return nodes.map((node, index) => {
    const key = `${keyPrefix}-inline-${index}`;

    if (node.type === "text") {
      return <React.Fragment key={key}>{applyTextFormat(node.text || "", node.format)}</React.Fragment>;
    }

    if (node.type === "linebreak") {
      return <br key={key} />;
    }

    if (node.type === "link") {
      const href = node.fields?.url || "#";
      const target = node.fields?.newTab ? "_blank" : undefined;
      const rel = node.fields?.newTab ? "noopener noreferrer" : undefined;

      return (
        <a
          key={key}
          href={href}
          target={target}
          rel={rel}
          className="text-accent underline underline-offset-2 hover:opacity-90"
        >
          {renderInline(node.children, key)}
        </a>
      );
    }

    return <React.Fragment key={key}>{renderInline(node.children, key)}</React.Fragment>;
  });
}

function renderBlocks(nodes: LexicalNode[] | undefined, keyPrefix: string): React.ReactNode {
  if (!Array.isArray(nodes)) return null;

  return nodes.map((node, index) => {
    const key = `${keyPrefix}-block-${index}`;

    if (node.type === "paragraph") {
      return (
        <p key={key} className="leading-8 text-foreground/90 mb-4 last:mb-0">
          {renderInline(node.children, key)}
        </p>
      );
    }

    if (node.type === "heading") {
      const tag = node.tag || "h2";

      if (tag === "h1") {
        return (
          <h1 key={key} className="text-3xl font-display font-bold text-foreground mt-7 mb-3">
            {renderInline(node.children, key)}
          </h1>
        );
      }

      if (tag === "h3") {
        return (
          <h3 key={key} className="text-xl font-display font-semibold text-foreground mt-6 mb-2">
            {renderInline(node.children, key)}
          </h3>
        );
      }

      return (
        <h2 key={key} className="text-2xl font-display font-semibold text-foreground mt-6 mb-2">
          {renderInline(node.children, key)}
        </h2>
      );
    }

    if (node.type === "quote") {
      return (
        <blockquote key={key} className="border-l-4 border-accent/50 pl-4 italic text-muted-foreground my-5">
          {renderInline(node.children, key)}
        </blockquote>
      );
    }

    if (node.type === "list") {
      const isOrdered = node.tag === "ol";
      const ListTag = isOrdered ? "ol" : "ul";
      return (
        <ListTag
          key={key}
          className={isOrdered ? "list-decimal pl-6 my-4 space-y-2" : "list-disc pl-6 my-4 space-y-2"}
        >
          {(node.children || []).map((listItem, listIndex) => {
            const itemKey = `${key}-item-${listIndex}`;
            return (
              <li key={itemKey} className="text-foreground/90">
                {listItem.type === "listitem"
                  ? renderInline(listItem.children, itemKey)
                  : renderInline([listItem], itemKey)}
              </li>
            );
          })}
        </ListTag>
      );
    }

    return (
      <div key={key} className="mb-4">
        {renderInline(node.children, key)}
      </div>
    );
  });
}

export default function RichTextRenderer({ content, className }: RichTextRendererProps) {
  if (!content) return null;

  if (typeof content === "string") {
    return <div className={className || "whitespace-pre-wrap leading-8 text-foreground/90"}>{content}</div>;
  }

  const document = content as LexicalDocument;
  const nodes = document.root?.children;

  if (!Array.isArray(nodes) || nodes.length === 0) return null;

  return <div className={className}>{renderBlocks(nodes, "rt")}</div>;
}
