// ArticleCard — premium blog/announcement card. Server component.
import Link from "next/link";
import { ArrowRightIcon } from "./icons";

export function ArticleCard({
  href,
  title,
  excerpt,
  date,
  type,
}: {
  href: string;
  title: string;
  excerpt: string | null;
  date: Date | null;
  type?: string;
}) {
  return (
    <Link href={href} className="m-article">
      <div className="m-article-meta">
        {type && <span className="m-tag">{labelFor(type)}</span>}
        {date && <span>{date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>}
      </div>
      <div className="m-article-title">{title}</div>
      {excerpt && <p className="m-article-excerpt">{excerpt}</p>}
      <span className="m-article-arrow">Read more <ArrowRightIcon size={14} /></span>
    </Link>
  );
}

function labelFor(t: string): string {
  switch (t) {
    case "blog": return "Engineering";
    case "announcement": return "Announcement";
    case "news": return "News";
    case "changelog": return "Changelog";
    default: return t;
  }
}
