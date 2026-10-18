import Link from "next/link"
import { getPublicPresentationConfig } from "../../lib/presentation/config"

export function SiteHeader() {
  const presentation = getPublicPresentationConfig()

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__brand" href="/">
          {presentation.branding.name}
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="site-header__nav">
            {presentation.navigation.header.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
