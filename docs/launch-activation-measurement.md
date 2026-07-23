# PathForge launch activation measurement

## Product question

PathForge should answer a more useful launch question than “did traffic go up?”:

> Did a real visitor inspect enough evidence to begin making or sharing a build?

The primary KPI is **evidence-qualified builder activation**. It counts external sessions that complete these events in order:

1. `project_opened`
2. `build_path_reached`
3. `builder_action_started` with `fork` or `share`

The rate is activated sessions divided by external project sessions. Either a historical `source_run_submitted` event or a production `community_project_submitted` bundle event is a completion after activation. A member counts as returned only when `my_forge_returned` occurs in a later first-party session than their builder action.

Direct project traffic is eligible. A visitor does not have to enter through the homepage or Explore first.

## Decision hierarchy

The admin dashboard uses four decision metrics:

- Evidence-qualified activation rate: the north-star launch signal.
- Evidence reach rate: whether project visitors inspect the actual build path.
- Submission completion rate: whether started forks/shares reach the review queue.
- Builder return rate: whether authenticated builders come back to My Forge in a later session.

Supporting diagnostics—search, artifact opening, model comparison, account creation, entry surface, and project contribution—exist to explain those rates. They are not success metrics by themselves.

Do not optimize a stage from a tiny sample. The dashboard withholds a bottleneck recommendation until at least 20 external project sessions exist in the selected window.

## Event contract

| Event | Trigger | Required classification |
| --- | --- | --- |
| `discovery_viewed` | Home, Explore, Ideas, Requests, or the guide renders | surface |
| `discovery_searched` | Search or discovery refinement | surface, `search` |
| `project_opened` | A prepared project/source-run page renders | project id |
| `build_path_reached` | At least 12% of the build-path section enters the viewport | project id |
| `artifact_opened` | A visitor selects, versions, displays, or safely opens an artifact | project id, `artifact` |
| `model_run_compared` | A model comparison is opened | project id, `model_compare` |
| `builder_action_started` | A response fork is opened or a share form receives its first focus | `fork` or `share` |
| `account_created` | Supabase confirms a new email identity or new OAuth onboarding begins | signup surface |
| `source_run_submitted` | Source-run intake succeeds | `fork` or `share` |
| `community_project_submitted` | Reviewed project bundle enters the private queue | `fork` or `share` |
| `my_forge_returned` | An authenticated My Forge dashboard renders | My Forge surface |

Client delivery is deduplicated per browser tab/session. The database event UUID provides a second idempotency boundary.

## Privacy and integrity boundaries

PathForge stores only a strict event name and small public classifications. It does **not** store:

- search queries;
- prompt or response text;
- artifact contents;
- full URLs or query strings;
- referrers;
- IP addresses;
- user agents;
- email addresses.

The browser receives a signed, HttpOnly, SameSite 30-minute session cookie. Its issue time is covered by the signature, so browser expiry and server verification both enforce the rolling lifetime. The browser cannot read or invent a valid session identifier. The identifier is not shared across sites and is not renewed without PathForge activity.

The ingestion route is same-origin, payload-limited, allowlisted, abortable, and best-effort so measurement cannot break a product action. It authenticates to one narrowly scoped Supabase Edge gateway with a dedicated server-side secret; only the secret digest is deployed to the gateway. The gateway validates any user token, reads profile provenance with Supabase's internal service credential, and calls service-only database RPCs. The Vercel web runtime never holds the Supabase service-role key. The database applies an atomic 90-event-per-10-minute session quota. Events are append-only, and maintenance removes events older than 400 days. The public Data API grants neither anonymous nor authenticated users event-table or analytics-RPC access; dashboard delivery additionally requires a validated admin identity.

`actor_type` keeps `anonymous` and ordinary `member` traffic separate from `seed`, `team`, and `admin` traffic. Primary and supporting product metrics use only anonymous/member activity. Preview and development environments are also separated from production.

## Operations

- Vercel Web Analytics supplies privacy-conscious aggregate page traffic.
- Vercel Speed Insights supplies real-user performance data.
- `/admin/analytics` supplies PathForge-specific activation and funnel decisions.
- Structured function logs include event name, environment, actor class, insert/deduplication outcome, and duration. They omit IDs, paths, titles, and personal data.
- The dashboard defaults to production and offers 7-, 30-, and 90-day windows.
- `npm run check:activation-analytics` guards the event taxonomy, privacy boundary, service-only grants, and required instrumentation.
