*** Settings ***
Library    RequestsLibrary
Library    Collections
Suite Setup    Create Session    graphmind    ${API_URL}
Suite Teardown    Delete All Sessions

*** Variables ***
${API_URL}    http://127.0.0.1:15000

*** Test Cases ***
Health And Integration Services Are Available
    [Documentation]    Checks API health and confirms Neo4j and Qdrant report connected.
    ${health_response}=    GET On Session    graphmind    /api/health    expected_status=200
    ${health}=    Evaluate    $health_response.json()
    ${health_ok}=    Get From Dictionary    ${health}    success
    Should Be True    ${health_ok}

    ${neo4j_response}=    GET On Session    graphmind    /api/neo4j/status    expected_status=200
    ${neo4j}=    Evaluate    $neo4j_response.json()
    ${neo4j_data}=    Get From Dictionary    ${neo4j}    data
    ${neo4j_connected}=    Get From Dictionary    ${neo4j_data}    connected
    Should Be True    ${neo4j_connected}

    ${qdrant_response}=    GET On Session    graphmind    /api/qdrant/status    expected_status=200
    ${qdrant}=    Evaluate    $qdrant_response.json()
    ${qdrant_data}=    Get From Dictionary    ${qdrant}    data
    ${qdrant_connected}=    Get From Dictionary    ${qdrant_data}    connected
    Should Be True    ${qdrant_connected}

OpenAPI Exposes Main Module Routes
    [Documentation]    Checks OpenAPI lists auth, upload, SOP, admin, shift-report, Neo4j, and Qdrant routes; does not call those business routes.
    ${response}=    GET On Session    graphmind    /openapi.json    expected_status=200
    ${schema}=    Evaluate    $response.json()
    ${paths}=    Get From Dictionary    ${schema}    paths
    Should Contain    ${paths}    /api/v1/auth/login
    Should Contain    ${paths}    /api/v1/sync/upload
    Should Contain    ${paths}    /api/v1/sop
    Should Contain    ${paths}    /api/v1/admin/users
    Should Contain    ${paths}    /api/dashboard/shift-reports
    Should Contain    ${paths}    /api/neo4j/status
    Should Contain    ${paths}    /api/qdrant/status
