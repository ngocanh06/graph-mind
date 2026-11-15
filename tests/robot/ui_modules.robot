*** Settings ***
Library    Browser
Suite Setup    Open Test Browser
Suite Teardown    Close Browser
Test Setup    New Context
Test Teardown    Close Context

*** Variables ***
${FRONTEND_URL}    http://127.0.0.1:15173
${ROBOT_TEST_PASSWORD}    robot-test-only-123

*** Test Cases ***
Admin Can Sign In Through The UI
    [Documentation]    Signs in as the seeded staging admin, confirms the authenticated identity, and checks for browser errors.
    New Page    ${FRONTEND_URL}/?mode=login
    Fill Text    css=input[type="text"]    admin
    Fill Text    css=input[type="password"]    ${ROBOT_TEST_PASSWORD}
    Click    css=form button[type="submit"]
    Wait Until Keyword Succeeds    15s    500ms    URL Leaves Login
    ${user}=    LocalStorage Get Item    aegis_auth_user
    Should Contain    ${user}    robot-admin@graphmind.test
    ${errors}=    Get Page Errors
    Should Be Empty    ${errors}

Home route renders without browser errors
    [Documentation]    Opens the home route and verifies rendered content with no browser errors; does not validate dashboard data.
    Verify View Renders    home
Executive dashboard route renders without browser errors
    [Documentation]    Opens the executive dashboard route and verifies rendered content with no browser errors; does not validate KPI values.
    Verify View Renders    executive
Copilot route renders without browser errors
    [Documentation]    Opens the Copilot route and verifies rendered content with no browser errors; does not submit a prompt.
    Verify View Renders    copilot
Knowledge graph route renders without browser errors
    [Documentation]    Opens the knowledge route and verifies rendered content with no browser errors; does not validate graph data.
    Verify View Renders    knowledge
Graph route renders without browser errors
    [Documentation]    Opens the graph route and verifies rendered content with no browser errors; does not validate graph data.
    Verify View Renders    graph
Knowledge explorer route renders without browser errors
    [Documentation]    Opens the explorer route and verifies rendered content with no browser errors; does not execute a search.
    Verify View Renders    explorer
Multifacet search route renders without browser errors
    [Documentation]    Opens the search route and verifies rendered content with no browser errors; does not execute a search.
    Verify View Renders    search
Connectors route renders without browser errors
    [Documentation]    Opens the connectors route and verifies rendered content with no browser errors; does not connect an external service.
    Verify View Renders    connectors
Risk view route renders without browser errors
    [Documentation]    Opens the risk route and verifies rendered content with no browser errors; does not validate risk calculations.
    Verify View Renders    risk
Documents route renders without browser errors
    [Documentation]    Opens the documents route and verifies rendered content with no browser errors; does not upload or sync a document.
    Verify View Renders    documents
SOP list route renders without browser errors
    [Documentation]    Opens the SOP list route and verifies rendered content with no browser errors; does not test SOP lifecycle.
    Verify View Renders    sop
SOP composer route renders without browser errors
    [Documentation]    Opens the SOP composer route and verifies rendered content with no browser errors; does not save or publish an SOP.
    Verify View Renders    sop_composer
Reports route renders without browser errors
    [Documentation]    Opens the reports route and verifies rendered content with no browser errors; does not validate report calculations.
    Verify View Renders    reports
Department report route renders without browser errors
    [Documentation]    Opens the department-report route and verifies rendered content with no browser errors; does not validate report data.
    Verify View Renders    department_report
Admin and RBAC route renders without browser errors
    [Documentation]    Opens the admin route and verifies rendered content with no browser errors; does not test permission enforcement.
    Verify View Renders    admin

*** Keywords ***
Open Test Browser
    New Browser    browser=chromium    headless=${TRUE}
    Set Browser Timeout    30s

URL Leaves Login
    ${url}=    Get Url
    Should Not Contain    ${url}    login

Verify View Renders
    [Arguments]    ${view}
    New Page    ${FRONTEND_URL}/?view=${view}
    Wait For Elements State    css=#root > *    state=attached    timeout=20s
    ${content}=    Get Text    css=#root
    Should Not Be Empty    ${content}
    ${errors}=    Get Page Errors
    Should Be Empty    ${errors}
