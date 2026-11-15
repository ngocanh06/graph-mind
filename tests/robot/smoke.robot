*** Settings ***
Library    Browser
Library    RequestsLibrary
Library    Collections

*** Variables ***
${FRONTEND_URL}    http://127.0.0.1:15173
${API_URL}         http://127.0.0.1:15000

*** Test Cases ***
Frontend Loads Graph Mind
    [Documentation]    Opens the frontend, verifies the GraphMind page title and non-empty rendered content.
    New Browser    browser=chromium    headless=${TRUE}
    New Page    ${FRONTEND_URL}
    Wait For Elements State    css=#root > *    state=attached    timeout=15s
    ${title}=    Get Title
    Should Contain    ${title}    GraphMind
    ${content}=    Get Text    css=#root
    Should Not Be Empty    ${content}
    [Teardown]    Close Browser

Backend Publishes Expected API
    [Documentation]    Reads OpenAPI and verifies health and login routes are published; does not call mutation endpoints.
    Create Session    graphmind    ${API_URL}
    ${response}=    GET On Session    graphmind    /openapi.json    expected_status=200
    ${schema}=    Evaluate    $response.json()
    ${paths}=    Get From Dictionary    ${schema}    paths
    Should Contain    ${paths}    /api/health
    Should Contain    ${paths}    /api/v1/auth/login
    [Teardown]    Delete All Sessions
