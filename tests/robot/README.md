# Robot Framework tests

The test scope roadmap and business-level test cases are documented in
[`docs/reports/TEST_CASES.md`](../../docs/reports/TEST_CASES.md). It identifies
what each GraphMind module still needs to prove; only the Robot scenarios listed
below have been automated. A passing render/API smoke test does not mean the
full business flow has passed.

The Robot suites target an isolated Docker stack, not the regular Graph Mind
containers or databases. Its PostgreSQL, Neo4j, and Qdrant data use dedicated
ports and named volumes. Do not change those targets to the normal app ports for
write tests.

## Install

From the repository root in PowerShell:

```powershell
py -3 -m venv .venv-robot
.\.venv-robot\Scripts\Activate.ps1
python -m pip install -r requirements-robot.txt
rfbrowser init
```

## Start the isolated test stack

If Docker Desktop is installed but its engine is stopped, start it first and
wait until `docker info` displays a **Server** section:

```powershell
docker desktop start
docker info
```

Then start only the isolated Robot-test services:

```powershell
docker compose -f docker-compose.robot.yml up -d postgres neo4j qdrant
docker compose -f docker-compose.robot.yml exec postgres pg_isready -U robot -d graph_mind_robot
docker compose -f docker-compose.robot.yml exec -T postgres psql -U robot -d graph_mind_robot -c "CREATE TABLE IF NOT EXISTS rbac_permissions (role VARCHAR(50));"
docker compose -f docker-compose.robot.yml up -d --build backend frontend
docker compose -f docker-compose.robot.yml --profile seed run --rm seed-test-users
```

The backend startup currently runs a legacy `ALTER TABLE rbac_permissions` even
though that table is not created by its current models. Initialize this
placeholder only in the isolated Robot database before starting the backend;
never run that SQL against the regular application database.

This stack binds only to `127.0.0.1`: frontend `15173`, backend `15000`,
PostgreSQL `15432`, Neo4j `17474`/`17687`, and Qdrant `16333`. Test credentials
are `admin` and `robot-user` with password `robot-test-only-123`; they are
disposable and must not be reused outside this stack.

## Run

For backend tests, use `-v` instead of `-q` to print each test name:

```powershell
python -m pytest -v
```

Run only one backend level when needed:

```powershell
python -m pytest -v backend\app\tests\unit
python -m pytest -v backend\app\tests\integration
```

For Robot E2E tests, start the isolated stack above, then:

```powershell
$out = Join-Path $env:TEMP 'graphmind-robot-results'
robot --console verbose --consolewidth 140 --outputdir $out tests\robot
Invoke-Item (Join-Path $out 'log.html')
```

Run only the M6 authentication, RBAC, and admin suite:

```powershell
$out = Join-Path $env:TEMP 'graphmind-m6-results'
robot --console verbose --consolewidth 140 --outputdir $out tests\robot\api_m6_auth.robot
Invoke-Item (Join-Path $out 'log.html')
```

Run the M2 SOP lifecycle and department-permission suite:

```powershell
$out = Join-Path $env:TEMP 'graphmind-m2-results'
robot --console verbose --consolewidth 140 --outputdir $out tests\robot\api_m2_sop.robot
Invoke-Item (Join-Path $out 'log.html')
```

Run the M2 Knowledge Editor API integration tests (these use a Neo4j fake; they
do not verify persistence against the Docker graph):

```powershell
python -m pytest -v backend\app\tests\integration\test_m2_graph_editor.py
```

The terminal shows each test case name and its PASS/FAIL status. Open `log.html`
to inspect each case's documentation, keywords/steps, and actual results;
`report.html` shows the overall summary. These files are written outside the repo
under `%TEMP%\graphmind-robot-results`.

The UI suite verifies sign-in and that routed views render without browser
errors; it does not verify each screen's full business behavior. The read-only
API suite checks health/service connections and that selected routes exist in
OpenAPI; it does not exercise every endpoint's business behavior. The workflow
suite creates, reads, and deletes a temporary SOP and user and verifies admin
RBAC; it refuses to run unless its API URL is the dedicated staging port.

Google OAuth and live LLM requests are intentionally not run: those require
separate sandbox credentials/services and may incur external effects or cost.

## Stop / reset

Stop the isolated services and preserve their test data:

```powershell
docker compose -f docker-compose.robot.yml down
```

To reset only the dedicated Robot staging databases and volumes:

```powershell
docker compose -f docker-compose.robot.yml down -v
```

Never use `down -v` with the regular project Compose file for test cleanup.
