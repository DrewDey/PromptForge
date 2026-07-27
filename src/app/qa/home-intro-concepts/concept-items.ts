/* Serializable slice of a build path, so the server page can hand real catalog
 * rows to the client concept components without shipping PromptWithRelations. */

export type ConceptItem = {
  id: string
  href: string
  title: string
  categoryLabel: string
  authorName: string
  promptCount: number
  modelLabel: string
  modelRunCount: number
  artifactPath: string
  preview: string
  /** The first prompt the builder actually typed, when the catalog carries it. */
  openingPrompt: string | null
}
