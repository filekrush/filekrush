interface RelatedTool {
  title: string;
  href: string;
  description?: string;
}

interface RelatedToolsProps {
  title: string;
  tools: RelatedTool[];
}

export default function RelatedTools({ title, tools }: RelatedToolsProps) {
  return (
    <section className="mt-16 pt-12 border-t border-[#e0e0e0]">
      <h2 className="font-[600] text-[#131313]">{title}</h2>
      <ul className="mt-6 flex flex-col gap-3">
        {tools.map((tool) => (
          <li key={tool.href}>
            <a href={tool.href} className="text-[#131313] hover:text-[#8e8e8e] transition-colors">
              {tool.title}
            </a>
            {tool.description && (
              <span className="text-[#8e8e8e]"> — {tool.description}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
