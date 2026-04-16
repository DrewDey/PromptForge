import Link from 'next/link'
import { Category } from '@/lib/types'

export default function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/browse?category=${category.slug}`}
      className="group block bg-white border border-surface-200 p-5 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] transition-all duration-150 text-center focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2"
    >
      <div className="text-3xl mb-2">{category.icon}</div>
      <h3 className="font-semibold text-surface-900 group-hover:text-brand-orange transition-colors duration-150 text-sm">
        {category.name}
      </h3>
      <p className="text-xs text-surface-500 mt-1 line-clamp-2">
        {category.description}
      </p>
      {category.prompt_count !== undefined && (
        <p className="text-xs text-surface-500 mt-2">
          {category.prompt_count} prompt{category.prompt_count !== 1 ? 's' : ''}
        </p>
      )}
    </Link>
  )
}
