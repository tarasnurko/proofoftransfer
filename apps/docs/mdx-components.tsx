import defaultMdxComponents from 'fumadocs-ui/mdx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MDXComponents = Record<string, React.ComponentType<any>>;

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...(defaultMdxComponents as MDXComponents),
    ...components,
  };
}
