import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../quartz/components/types"
import style from "./blog-footer.scss"

export interface BlogFooterOptions {
  links: Record<string, string>
}

export default ((options: BlogFooterOptions) => {
  const BlogFooter: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    const year = new Date().getFullYear()

    return (
      <footer class={displayClass ?? ""}>
        <p>
          {"\u00a9"} {year} LIS Blog.
        </p>
        <ul>
          {Object.entries(options.links).map(([text, link]) => (
            <li key={link}>
              <a href={link}>{text}</a>
            </li>
          ))}
        </ul>
      </footer>
    )
  }

  BlogFooter.css = style
  return BlogFooter
}) satisfies QuartzComponentConstructor<BlogFooterOptions>
