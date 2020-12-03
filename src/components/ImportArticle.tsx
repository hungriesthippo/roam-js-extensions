import ReactDOM from "react-dom";
import React, { ChangeEvent, useCallback, useState } from "react";
import {
  Button,
  Icon,
  InputGroup,
  Popover,
  Spinner,
  Text,
} from "@blueprintjs/core";
import { asyncType, newBlockEnter, openBlock } from "roam-client";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import {
  parse,
  HTMLElement as ParsedHTMLElement,
  Node as ParsedNode,
  NodeType,
} from "node-html-parser";

const getTextFromNode = (e: ParsedNode): string => {
  if (e.childNodes.length === 0 && e.nodeType !== NodeType.ELEMENT_NODE) {
    return e.innerText
      .replace(/&nbsp;/g, "")
      .replace(/&#8211;/g, "-")
      .replace(/&#8212;/g, "-")
      .replace(/&#8216;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"');
  }

  const element = e as ParsedHTMLElement;
  const children = element.childNodes.map((c) => getTextFromNode(c)).join("");
  if (element.rawTagName === "p") {
    return children;
  } else if (element.rawTagName === "li") {
    return children;
  } else if (element.rawTagName === "div") {
    return children;
  } else if (element.rawTagName === "span") {
    return children;
  } else if (element.rawTagName === "blockquote") {
    return element.childNodes.map((c) => `    ${getTextFromNode(c)}`).join("");
  } else if (element.rawTagName === "ul") {
    return element.childNodes.map((c) => `    ${getTextFromNode(c)}`).join("");
  } else if (element.rawTagName === "ol") {
    return element.childNodes.map((c) => `    ${getTextFromNode(c)}`).join("");
  } else if (element.rawTagName === "em") {
    return `__${children}__`;
  } else if (element.rawTagName === "i") {
    return `__${children}__`;
  } else if (element.rawTagName === "strong") {
    return `**${children}**`;
  } else if (element.rawTagName === "b") {
    return `**${children}**`;
  } else if (element.rawTagName === "a") {
    return `[${children}](${element.getAttribute("href")})`;
  } else if (element.rawTagName === "br") {
    return "";
  } else if (element.rawTagName === "h1") {
    return `# ${children}`;
  } else if (element.rawTagName === "h2") {
    return `## ${children}`;
  } else if (element.rawTagName === "h3") {
    return `### ${children}`;
  } else if (element.rawTagName === "h4") {
    return `### ${children}`;
  } else if (element.rawTagName === "img") {
    const src = element.getAttribute("src");
    const dataSrc = element.getAttribute("data-src");
    return `![${element.getAttribute("alt")}](${dataSrc || src})`;
  } else if (element.rawTagName === "script") {
    return "";
  } else if (element.rawTagName === "noscript") {
    return "";
  } else {
    console.warn("unsupported raw tag", element.rawTagName);
    return children;
  }
};

const getText = async (e: ParsedNode) => {
  const text = getTextFromNode(e);
  if (
    text.startsWith("# ") ||
    text.startsWith("## ") ||
    text.startsWith("### ")
  ) {
    const headingIndex = text.indexOf("# ");
    const typeText = text.substring(0, headingIndex + 2);
    const pasteText = text.substring(headingIndex + 2);
    await asyncType(typeText);
    return pasteText;
  }
  return text;
}

const getContent = (article: ParsedHTMLElement) => {
  const header = article.querySelector("header");
  const content = header.nextElementSibling;
  const anyPs = content.childNodes.some(
    (c) => (c as ParsedHTMLElement).rawTagName === "p"
  );
  if (anyPs) {
    return content;
  }
  const nestedContent = content.childNodes.find(
    (c) =>
      c.nodeType === NodeType.ELEMENT_NODE &&
      (c as ParsedHTMLElement).classNames.some((s) => s.includes("entry"))
  );
  if (nestedContent) {
    return nestedContent;
  }
  console.warn("Could not find article content");
  return article;
};

const ImportContent = ({ blockId }: { blockId: string }) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      setError("");
    },
    [setValue]
  );
  const importArticle = useCallback(() => {
    setError("");
    setLoading(true);
    axios
      .post(`${process.env.REST_API_URL}/article`, { url: value })
      .then(async (r) => {
        const root = parse(r.data);
        const article = root.querySelector("article");
        const content = getContent(article);
        await openBlock(document.getElementById(blockId));
        await userEvent.clear(document.activeElement);
        const nodes = content.childNodes.filter(
          (c) =>
            !!c.innerText.trim() &&
            (c as ParsedHTMLElement).rawTagName !== "div"
        );
        for (const node of nodes) {
          const textarea = document.activeElement as HTMLTextAreaElement;
          const text = await getText(node);
          await userEvent.paste(textarea, text, {
            // @ts-ignore - https://github.com/testing-library/user-event/issues/512
            clipboardData: new DataTransfer(),
          });
          const end = textarea.value.length;
          textarea.setSelectionRange(end, end);
          await newBlockEnter();
        }
      })
      .catch(() => {
        setError("Error Importing Article");
        setLoading(false);
      });
  }, [blockId, value, setError, setLoading]);
  return (
    <div style={{ padding: 16 }}>
      <div>
        <InputGroup
          leftElement={<Icon icon="link" />}
          onChange={onChange}
          placeholder="Enter url..."
          value={value}
          autoFocus={true}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              importArticle();
            }
          }}
          width={600}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <Button
          text={loading ? <Spinner size={20} /> : "IMPORT"}
          onClick={importArticle}
          disabled={loading}
        />
        <Text>{error}</Text>
      </div>
    </div>
  );
};

const ImportArticle = ({ blockId }: { blockId: string }) => (
  <Popover
    content={<ImportContent blockId={blockId} />}
    target={<Button text="IMPORT ARTICLE" data-roamjs-import-article />}
    defaultIsOpen={true}
  />
);

export const renderImportArticle = (blockId: string, p: HTMLElement) =>
  ReactDOM.render(<ImportArticle blockId={blockId} />, p);

export default ImportArticle;