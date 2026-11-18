'use client';

import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Agent text is untrusted. There is no rehype-raw, so raw HTML shows as
// text, and react-markdown's default urlTransform blanks unsafe link
// protocols such as javascript:.

type Tag = keyof React.JSX.IntrinsicElements;
type MarkdownProps<T extends Tag> = React.ComponentProps<T> & ExtraProps;

/** react-markdown passes its syntax-tree `node`; keep it off the DOM. */
function withoutNode<P extends ExtraProps>(props: P): Omit<P, 'node'> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

/** The element as react-markdown would render it, with our classes. */
function styled<T extends Tag>(tag: T, className: string) {
  return function Styled(props: MarkdownProps<T>) {
    const Element = tag as React.ElementType;
    return <Element {...withoutNode(props)} className={className} />;
  };
}

/** Absolute http(s) URLs leave the app; relative ones stay in it. */
function isExternal(href: string | undefined) {
  return !!href && /^https?:\/\//i.test(href);
}

function Link(props: MarkdownProps<'a'>) {
  return (
    <a
      {...withoutNode(props)}
      className="underline decoration-accent decoration-2 underline-offset-2 hover:decoration-foreground"
      {...(isExternal(props.href) && {
        target: '_blank',
        rel: 'noopener noreferrer',
      })}
    />
  );
}

// Don't load images named in agent text; show what they describe instead.
function ImageAlt({ alt }: MarkdownProps<'img'>) {
  return alt ? <span>{alt}</span> : null;
}

function Table(props: MarkdownProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table {...withoutNode(props)} className="border-collapse text-sm" />
    </div>
  );
}

const list =
  'space-y-1 pl-5 marker:text-muted-foreground [&_ol]:mt-1 [&_ul]:mt-1';
const heading = 'text-lg font-semibold';
const minorHeading = 'text-base font-semibold';
const cell = 'border border-border px-2 py-1 text-left';

const components: Components = {
  a: Link,
  img: ImageAlt,
  ul: styled('ul', `list-disc ${list}`),
  ol: styled('ol', `list-decimal ${list}`),
  strong: styled('strong', 'font-semibold'),
  em: styled('em', 'italic'),
  h1: styled('h1', heading),
  h2: styled('h2', heading),
  h3: styled('h3', heading),
  h4: styled('h4', minorHeading),
  h5: styled('h5', minorHeading),
  h6: styled('h6', minorHeading),
  // Styled as inline code; inside a code block `pre` undoes the chip.
  code: styled('code', 'rounded bg-muted px-1 py-0.5 font-mono text-sm'),
  pre: styled(
    'pre',
    'overflow-x-auto rounded-[10px] bg-muted p-3 text-sm [&>code]:bg-transparent [&>code]:p-0'
  ),
  blockquote: styled(
    'blockquote',
    'border-l-2 border-border pl-3 text-muted-foreground'
  ),
  table: Table,
  th: styled('th', cell),
  td: styled('td', cell),
  hr: styled('hr', 'border-border'),
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="min-w-0 text-base leading-relaxed break-words [&>*+*]:mt-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
