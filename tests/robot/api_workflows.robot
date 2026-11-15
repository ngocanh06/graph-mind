*** Settings ***
Library    RequestsLibrary
Library    Collections
Suite Setup    Connect To Staging And Login
Suite Teardown    Delete All Sessions

*** Variables ***
${API_URL}               http://127.0.0.1:15000
${ROBOT_TEST_PASSWORD}   robot-test-only-123
${ADMIN_TOKEN}           ${EMPTY}
${USER_TOKEN}            ${EMPTY}
${SOP_CODE}              ${EMPTY}
${CREATED_USER_ID}       ${EMPTY}

*** Test Cases ***
RBAC Restricts User Administration
    [Documentation]    Confirms a standard user receives HTTP 403 for user administration while an admin receives HTTP 200.
    ${admin_headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${user_headers}=    Authorization Headers    ${USER_TOKEN}
    ${forbidden}=    GET On Session    graphmind    /api/v1/admin/users    headers=${user_headers}    expected_status=403
    Should Be Equal As Integers    ${forbidden.status_code}    403
    ${allowed}=    GET On Session    graphmind    /api/v1/admin/users    headers=${admin_headers}    expected_status=200
    Should Be True    $allowed.json() is not None

SOP Draft Can Be Created Read And Deleted
    [Documentation]    Creates a uniquely named SOP draft, finds it in the SOP list, deletes it, and cleans it up on failure.
    Set Test Variable    ${SOP_CODE}    ${EMPTY}
    ${suffix}=    Evaluate    __import__('uuid').uuid4().hex[:8]
    ${code}=    Set Variable    SOP-ROBOT-${suffix}
    Set Test Variable    ${SOP_CODE}    ${code}
    ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${tags}=    Create List
    ${steps}=    Create List
    ${payload}=    Create Dictionary
    ...    code=${code}
    ...    title=Robot test ${suffix}
    ...    dept=Robot Testing
    ...    version=v1.0
    ...    tags=${tags}
    ...    purpose=Temporary Robot Framework fixture
    ...    steps=${steps}
    ...    governance=${EMPTY}
    ${created}=    POST On Session    graphmind    /api/v1/sop    json=${payload}    headers=${headers}    expected_status=200
    ${created_body}=    Evaluate    $created.json()
    ${created_ok}=    Get From Dictionary    ${created_body}    success
    Should Be True    ${created_ok}
    ${query}=    Create Dictionary    q=${code}
    ${listed}=    GET On Session    graphmind    url=/api/v1/sop    params=${query}    expected_status=200
    ${listed_body}=    Evaluate    $listed.json()
    ${count}=    Get From Dictionary    ${listed_body}    count
    Should Be True    ${count} >= 1
    ${deleted}=    DELETE On Session    graphmind    /api/v1/sop/${code}    headers=${headers}    expected_status=200
    ${deleted_body}=    Evaluate    $deleted.json()
    ${deleted_ok}=    Get From Dictionary    ${deleted_body}    success
    Should Be True    ${deleted_ok}
    Set Test Variable    ${SOP_CODE}    ${EMPTY}
    [Teardown]    Cleanup Test SOP    ${SOP_CODE}

Admin Can Create And Delete A User
    [Documentation]    Creates a temporary standard user through the admin API, deletes it, and cleans it up on failure.
    Set Test Variable    ${CREATED_USER_ID}    ${EMPTY}
    ${suffix}=    Evaluate    __import__('uuid').uuid4().hex[:8]
    ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${payload}=    Create Dictionary
    ...    email=robot-${suffix}@graphmind.test
    ...    password=${ROBOT_TEST_PASSWORD}
    ...    full_name=Temporary Robot User
    ...    role=standard
    ${created}=    POST On Session    graphmind    /api/v1/admin/users    json=${payload}    headers=${headers}    expected_status=201
    ${created_body}=    Evaluate    $created.json()
    ${user_id}=    Get From Dictionary    ${created_body}    user_id
    Set Test Variable    ${CREATED_USER_ID}    ${user_id}
    ${deleted}=    DELETE On Session    graphmind    /api/v1/admin/users/${user_id}    headers=${headers}    expected_status=204
    Should Be Equal As Integers    ${deleted.status_code}    204
    Set Test Variable    ${CREATED_USER_ID}    ${EMPTY}
    [Teardown]    Cleanup Test User    ${CREATED_USER_ID}

*** Keywords ***
Connect To Staging And Login
    Should Be Equal    ${API_URL}    http://127.0.0.1:15000    Write tests are restricted to the isolated Robot staging API.
    Create Session    graphmind    ${API_URL}
    ${admin}=    Login As    admin
    ${admin_token}=    Get From Dictionary    ${admin}    access_token
    Set Suite Variable    ${ADMIN_TOKEN}    ${admin_token}
    ${user}=    Login As    robot-user
    ${user_token}=    Get From Dictionary    ${user}    access_token
    Set Suite Variable    ${USER_TOKEN}    ${user_token}

Login As
    [Arguments]    ${username}
    ${payload}=    Create Dictionary    identifier=${username}    password=${ROBOT_TEST_PASSWORD}
    ${response}=    POST On Session    graphmind    /api/v1/auth/login    json=${payload}    expected_status=200
    RETURN    ${response.json()}

Authorization Headers
    [Arguments]    ${token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}
    RETURN    ${headers}

Cleanup Test SOP
    [Arguments]    ${code}
    IF    $code
        ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
        ${response}=    DELETE On Session    graphmind    /api/v1/sop/${code}    headers=${headers}    expected_status=any
        Should Be True    $response.status_code in (200, 404)
    END

Cleanup Test User
    [Arguments]    ${user_id}
    IF    $user_id
        ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
        ${response}=    DELETE On Session    graphmind    /api/v1/admin/users/${user_id}    headers=${headers}    expected_status=any
        Should Be True    $response.status_code in (204, 404)
    END
