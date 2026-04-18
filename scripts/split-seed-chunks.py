#!/usr/bin/env python3
"""
Split supabase/seed-content-chains.sql into ~10-project chunks for the
Supabase SQL Editor (which rejects very large queries).

Usage:
    python3 scripts/split-seed-chunks.py [--chunk-size N]

Default chunk size is 10 projects. Output goes to supabase/chunks/part-NN.sql.
The chunks/ dir is gitignored — regenerate locally before pasting.

Each chunk:
- Includes the same FK-safe DISABLE RLS header as the source file
- Includes ALTER TABLE ENABLE RLS at the bottom
- Is idempotent (DELETE-before-INSERT by fixed UUID), safe to re-paste
- Self-contained — pastes work in any order, but pasting in order matches
  the project sequence in the source.
"""
import re, os, sys, argparse

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chunk-size", type=int, default=10,
                    help="Projects per chunk (default 10). Lower if Supabase rejects.")
    ap.add_argument("--src", default="supabase/seed-content-chains.sql")
    ap.add_argument("--out-dir", default="supabase/chunks")
    args = ap.parse_args()

    if not os.path.exists(args.src):
        print(f"ERROR: source file not found: {args.src}")
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)
    # Remove existing part-*.sql to avoid stale files
    for f in os.listdir(args.out_dir):
        if f.startswith("part-") and f.endswith(".sql"):
            os.remove(os.path.join(args.out_dir, f))

    with open(args.src) as f:
        lines = f.readlines()

    proj_start_pattern = re.compile(r"^DELETE FROM prompt_steps WHERE prompt_id = '55555555")

    project_starts = [i for i, line in enumerate(lines) if proj_start_pattern.match(line)]
    if not project_starts:
        print("ERROR: no projects found")
        sys.exit(1)

    header_end_idx = project_starts[0]
    enable_idx = next((i for i, line in enumerate(lines)
                       if line.startswith("ALTER TABLE prompts ENABLE ROW LEVEL SECURITY")), None)

    header = "".join(lines[:header_end_idx])
    footer = ("".join(lines[enable_idx:]) if enable_idx
              else "ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;\nALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;\n")

    project_starts = [s for s in project_starts if s < (enable_idx or len(lines))]
    project_ends = project_starts[1:] + [enable_idx or len(lines)]

    total = len(project_starts)
    chunk_count = (total + args.chunk_size - 1) // args.chunk_size
    print(f"Splitting {total} projects into {chunk_count} chunks of {args.chunk_size}")

    for ci in range(chunk_count):
        start = ci * args.chunk_size
        end = min(start + args.chunk_size, total)
        out_path = f"{args.out_dir}/part-{ci+1:02d}.sql"
        with open(out_path, "w") as f:
            f.write(header)
            f.write(f"\n-- =========================================================================\n")
            f.write(f"-- CHUNK {ci+1} of {chunk_count} — projects {start+1} through {end}\n")
            f.write(f"-- Idempotent (DELETE-before-INSERT). Safe to re-paste.\n")
            f.write(f"-- =========================================================================\n\n")
            for i in range(start, end):
                f.write("".join(lines[project_starts[i]:project_ends[i]]))
            f.write("\n" + footer)
        size_kb = os.path.getsize(out_path) // 1024
        print(f"  {out_path}  ({end - start} projects, {size_kb} KB)")

    print(f"\nDone. Paste chunks in supabase/chunks/ into Supabase SQL Editor in order.")

if __name__ == "__main__":
    main()
