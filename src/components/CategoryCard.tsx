import Link from 'next/link'
import { Category } from '@/lib/types'

export default function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/browse?category=${category.slug}`}
      className="group block bg-white border border-gray-200 p-5 hover:border-brand-orange transition-all text-center"
    >
      <div className="text-3xl mb-2">{category.icon}</div>
      <h3 className="font-semibold text-gray-900 group-hover:text-brand-orange transition-colors text-sm">
        {category.name}
      </h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
        {category.description}
      </p>
      {category.prompt_count !== undefined && (
        <p className="text-xs text-gray-500 mt-2">
          {category.prompt_count} prompt{category.prompt_count !== 1 ? 's' : ''}
        </p>
      )}
    </Link>
  )
}
