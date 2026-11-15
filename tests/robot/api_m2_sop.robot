*** Settings ***
Library    RequestsLibrary
Library    Collections
Suite Setup    Connect To Staging And Create Manager
Suite Teardown    Cleanup M2 Fixtures

*** Variables ***
${API_URL}                http://127.0.0.1:15000
${ROBOT_TEST_PASSWORD}    robot-test-only-123
${ADMIN_TOKEN}            ${EMPTY}
${STANDARD_TOKEN}         ${EMPTY}
${MANAGER_TOKEN}          ${EMPTY}
${MANAGER_ID}             ${EMPTY}

*** Test Cases ***
Manager Can Create Edit Read Filter And Delete SOP Draft
    [Documentation]    Exercises SOP draft persistence, edit through the supported save endpoint, list filters, detail, and cleanup.
    Set Test Variable    ${SOP_CODE}    ${EMPTY}
    ${suffix}=    Evaluate    __import__('uuid').uuid4().hex[:8]
    ${code}=    Set Variable    SOP-M2-DRAFT-${suffix}
    Set Test Variable    ${SOP_CODE}    ${code}
    ${headers}=    Authorization Headers    ${MANAGER_TOKEN}
    ${step}=    Create Dictionary    num=1    title=Initial step    desc=Initial source-safe text
    ${steps}=    Create List    ${step}
    ${tags}=    Create List    m2-test
    ${payload}=    Create Dictionary
    ...    code=${code}
    ...    title=M2 draft ${suffix}
    ...    dept=Sales
    ...    version=v1.0
    ...    tags=${tags}
    ...    purpose=Initial purpose
    ...    steps=${steps}
    ...    governance=Test governance
    ${created}=    POST On Session    graphmind    /api/v1/sop    json=${payload}    headers=${headers}    expected_status=200
    Should Be True    $created.json()["success"]
    Should Be Equal    ${created.json()}[data][status]    draft
    Should Be Equal    ${created.json()}[data][code]    ${code}

    ${detail}=    GET On Session    graphmind    /api/v1/sop/${code}    expected_status=200
    Should Be Equal    ${detail.json()}[data][purpose]    Initial purpose
    Should Be Equal    ${detail.json()}[data][steps][0][title]    Initial step

    ${updated_step}=    Create Dictionary    num=1    title=Updated step    desc=Updated source-safe text
    ${updated_steps}=    Create List    ${updated_step}
    ${updated_tags}=    Create List    m2-test    edited
    ${updated_payload}=    Create Dictionary
    ...    code=${code}
    ...    title=M2 draft edited ${suffix}
    ...    dept=Sales
    ...    version=v1.1
    ...    tags=${updated_tags}
    ...    purpose=Updated purpose
    ...    steps=${updated_steps}
    ...    governance=Updated governance
    ${updated}=    POST On Session    graphmind    /api/v1/sop    json=${updated_payload}    headers=${headers}    expected_status=200
    Should Be Equal    ${updated.json()}[data][status]    draft
    Should Be Equal    ${updated.json()}[data][title]    M2 draft edited ${suffix}
    Should Be Equal    ${updated.json()}[data][version]    v1.1

    ${reloaded}=    GET On Session    graphmind    /api/v1/sop/${code}    expected_status=200
    Should Be Equal    ${reloaded.json()}[data][purpose]    Updated purpose
    Should Be Equal    ${reloaded.json()}[data][steps][0][title]    Updated step
    Should Be Equal    ${reloaded.json()}[data][governance]    Updated governance

    ${query}=    Create Dictionary    dept=Sales    status=draft    q=${code}
    ${listed}=    GET On Session    graphmind    /api/v1/sop    params=${query}    expected_status=200
    Should Be True    $listed.json()["count"] >= 1
    ${codes}=    Evaluate    [item["code"] for item in $listed.json()["data"]]
    List Should Contain Value    ${codes}    ${code}

    ${admin_headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${deleted}=    DELETE On Session    graphmind    /api/v1/sop/${code}    headers=${admin_headers}    expected_status=200
    Should Be True    $deleted.json()["success"]
    Set Test Variable    ${SOP_CODE}    ${EMPTY}
    GET On Session    graphmind    /api/v1/sop/${code}    expected_status=404
    [Teardown]    Cleanup Test SOP    ${SOP_CODE}

Manager Can Publish SOP In Their Department
    [Documentation]    Publishes a Sales SOP as the Sales manager and confirms a standard user can read the published record.
    Set Test Variable    ${SOP_CODE}    ${EMPTY}
    ${suffix}=    Evaluate    __import__('uuid').uuid4().hex[:8]
    ${code}=    Set Variable    SOP-M2-PUBLISH-${suffix}
    Set Test Variable    ${SOP_CODE}    ${code}
    ${manager_headers}=    Headers With Department    ${MANAGER_TOKEN}    Sales
    ${admin_headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${payload}=    Create Dictionary    code=${code}    title=M2 published ${suffix}    dept=Sales    purpose=Published test purpose
    ${created}=    POST On Session    graphmind    /api/v1/sop    json=${payload}    headers=${manager_headers}    expected_status=200
    Should Be Equal    ${created.json()}[data][status]    draft

    ${publish_payload}=    Create Dictionary    sop_id=${code}
    ${published}=    POST On Session    graphmind    /api/v1/sop/publish    json=${publish_payload}    headers=${manager_headers}    expected_status=200
    Should Be Equal    ${published.json()}[data][status]    published
    Should Not Be Equal    ${published.json()}[data][publishedAt]    ${None}

    ${standard_headers}=    Authorization Headers    ${STANDARD_TOKEN}
    ${read}=    GET On Session    graphmind    /api/v1/sop/${code}    headers=${standard_headers}    expected_status=200
    Should Be Equal    ${read.json()}[data][status]    published
    Should Be Equal    ${read.json()}[data][title]    M2 published ${suffix}

    ${audit_query}=    Create Dictionary    action=PUBLISH_SOP    resource_type=SOP    limit=200
    ${audit}=    GET On Session    graphmind    /api/v1/admin/audit-logs    params=${audit_query}    headers=${admin_headers}    expected_status=200
    ${matching_audit}=    Evaluate    [item for item in $audit.json()["items"] if item["resource_id"] == $code and item["action"] == "PUBLISH_SOP"]
    Should Not Be Empty    ${matching_audit}
    Should Be Equal    ${matching_audit}[0][actor_id]    ${MANAGER_ID}

    ${deleted}=    DELETE On Session    graphmind    /api/v1/sop/${code}    headers=${admin_headers}    expected_status=200
    Should Be True    $deleted.json()["success"]
    Set Test Variable    ${SOP_CODE}    ${EMPTY}
    [Teardown]    Cleanup Test SOP    ${SOP_CODE}

Manager And Standard Cannot Publish Out-Of-Scope SOPs
    [Documentation]    Confirms BR-04 blocks a Sales manager from publishing Legal SOPs and blocks a standard user; both drafts remain unchanged.
    Set Test Variable    ${SOP_CODES}    ${EMPTY}
    ${suffix}=    Evaluate    __import__('uuid').uuid4().hex[:8]
    ${legal_code}=    Set Variable    SOP-M2-LEGAL-${suffix}
    ${standard_code}=    Set Variable    SOP-M2-STANDARD-${suffix}
    ${codes}=    Create List    ${legal_code}    ${standard_code}
    Set Test Variable    ${SOP_CODES}    ${codes}
    ${admin_headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${manager_headers}=    Headers With Department    ${MANAGER_TOKEN}    Sales
    ${standard_headers}=    Authorization Headers    ${STANDARD_TOKEN}

    ${legal_payload}=    Create Dictionary    code=${legal_code}    title=M2 Legal draft ${suffix}    dept=Legal    purpose=Legal test purpose
    ${legal_created}=    POST On Session    graphmind    /api/v1/sop    json=${legal_payload}    headers=${admin_headers}    expected_status=200
    Should Be Equal    ${legal_created.json()}[data][status]    draft
    ${legal_publish}=    Create Dictionary    sop_id=${legal_code}
    ${manager_denied}=    POST On Session    graphmind    /api/v1/sop/publish    json=${legal_publish}    headers=${manager_headers}    expected_status=403
    Should Contain    ${manager_denied.json()}[detail]    BR-04
    ${legal_after_denial}=    GET On Session    graphmind    /api/v1/sop/${legal_code}    expected_status=200
    Should Be Equal    ${legal_after_denial.json()}[data][status]    draft

    ${standard_payload}=    Create Dictionary    code=${standard_code}    title=M2 Standard draft ${suffix}    dept=Sales    purpose=Standard test purpose
    ${standard_created}=    POST On Session    graphmind    /api/v1/sop    json=${standard_payload}    headers=${admin_headers}    expected_status=200
    Should Be Equal    ${standard_created.json()}[data][status]    draft
    ${standard_publish}=    Create Dictionary    sop_id=${standard_code}
    POST On Session    graphmind    /api/v1/sop/publish    json=${standard_publish}    headers=${standard_headers}    expected_status=403
    ${standard_after_denial}=    GET On Session    graphmind    /api/v1/sop/${standard_code}    expected_status=200
    Should Be Equal    ${standard_after_denial.json()}[data][status]    draft

    FOR    ${code}    IN    @{codes}
        DELETE On Session    graphmind    /api/v1/sop/${code}    headers=${admin_headers}    expected_status=200
    END
    Set Test Variable    ${SOP_CODES}    ${EMPTY}
    [Teardown]    Cleanup Test SOPs    ${SOP_CODES}

*** Keywords ***
Connect To Staging And Create Manager
    Should Be Equal    ${API_URL}    http://127.0.0.1:15000    M2 write tests require the isolated Robot staging API.
    Create Session    graphmind    ${API_URL}
    ${admin}=    Login As    admin
    Set Suite Variable    ${ADMIN_TOKEN}    ${admin}[access_token]
    ${standard}=    Login As    robot-user
    Set Suite Variable    ${STANDARD_TOKEN}    ${standard}[access_token]
    ${suffix}=    Evaluate    __import__('uuid').uuid4().hex[:8]
    ${email}=    Set Variable    robot-m2-editor-${suffix}@graphmind.test
    ${payload}=    Create Dictionary    email=${email}    password=Robot-M2-${suffix}    full_name=Robot M2 Editor    role=knowledge_manager
    ${admin_headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${created}=    POST On Session    graphmind    /api/v1/admin/users    json=${payload}    headers=${admin_headers}    expected_status=201
    Set Suite Variable    ${MANAGER_ID}    ${created.json()}[user_id]
    ${manager}=    Login As    ${email}    Robot-M2-${suffix}
    Set Suite Variable    ${MANAGER_TOKEN}    ${manager}[access_token]

Login As
    [Arguments]    ${identifier}    ${password}=${ROBOT_TEST_PASSWORD}
    ${payload}=    Create Dictionary    identifier=${identifier}    password=${password}
    ${response}=    POST On Session    graphmind    /api/v1/auth/login    json=${payload}    expected_status=200
    RETURN    ${response.json()}

Authorization Headers
    [Arguments]    ${token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}
    RETURN    ${headers}

Headers With Department
    [Arguments]    ${token}    ${department}
    ${headers}=    Authorization Headers    ${token}
    Set To Dictionary    ${headers}    X-User-Dept    ${department}
    RETURN    ${headers}

Cleanup Test SOP
    [Arguments]    ${code}
    IF    $code
        ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
        ${response}=    DELETE On Session    graphmind    /api/v1/sop/${code}    headers=${headers}    expected_status=any
        Should Be True    $response.status_code in (200, 404)
    END

Cleanup Test SOPs
    [Arguments]    ${codes}
    IF    $codes
        ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
        FOR    ${code}    IN    @{codes}
            ${response}=    DELETE On Session    graphmind    /api/v1/sop/${code}    headers=${headers}    expected_status=any
            Should Be True    $response.status_code in (200, 404)
        END
    END

Cleanup M2 Fixtures
    Run Keyword If    $MANAGER_ID    Cleanup Test User    ${MANAGER_ID}
    Delete All Sessions

Cleanup Test User
    [Arguments]    ${user_id}
    ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${response}=    DELETE On Session    graphmind    /api/v1/admin/users/${user_id}    headers=${headers}    expected_status=any
    Should Be True    $response.status_code in (204, 404)
