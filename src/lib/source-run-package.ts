import fs from 'node:fs'
import path from 'node:path'

export function loadSourceRunPackage(fileName: string): any {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'seed-runs', fileName), 'utf8')
  )
}
