import defaultMdxComponents from 'fumadocs-ui/mdx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MDXComponents = Record<string, React.ComponentType<any>>;

function VideoPlayer({ src, title }: { src: string; title?: string }) {
  return (
    <video
      src={src}
      title={title}
      controls
      playsInline
      style={{ width: '100%', marginTop: '1rem', marginBottom: '1rem' }}
    />
  );
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...(defaultMdxComponents as MDXComponents),
    VideoPlayer,
    ...components,
  };
}
