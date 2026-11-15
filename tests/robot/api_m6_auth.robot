*** Settings ***
Library    RequestsLibrary
Library    Collections
Suite Setup    Connect To Staging And Login
Suite Teardown    Delete All Sessions

*** Variables ***
${API_URL}                http://127.0.0.1:15000
${ROBOT_TEST_PASSWORD}    robot-test-only-123
${ADMIN_TOKEN}            ${EMPTY}
${USER_TOKEN}             ${EMPTY}

*** Test Cases ***
Login By Username And Email Returns The Same Identity
    [Documentation]    Logs in using the seeded admin username and email, checks the same identity and role, and verifies JWT /me.
    ${username_login}=    Login With Credentials    admin    ${ROBOT_TEST_PASSWORD}    200
    ${email_login}=    Login With Credentials    robot-admin@graphmind.test    ${ROBOT_TEST_PASSWORD}    200
    ${username_user}=    Get From Dictionary    ${username_login}    user
    ${email_user}=    Get From Dictionary    ${email_login}    user
    ${username_id}=    Get From Dictionary    ${username_user}    id
    ${email_id}=    Get From Dictionary    ${email_user}    id
    Should Be Equal    ${username_id}    ${email_id}
    Should Be Equal    ${username_user}[role]    it_admin
    Should Be Equal    ${username_login}[token_type]    bearer
    ${token}=    Get From Dictionary    ${username_login}    access_token
    ${headers}=    Authorization Headers    ${token}
    ${me}=    GET On Session    graphmind    /api/v1/auth/me    headers=${headers}    expected_status=200
    Should Be Equal    ${me.json()}[email]    robot-admin@graphmind.test

Invalid Login Inputs Do Not Issue Tokens
    [Documentation]    Checks wrong password, missing user, missing fields, empty fields, missing JWT, and user-token denial for admin APIs.
    ${wrong_password}=    Login With Credentials    robot-user    wrong-password    401
    Dictionary Should Not Contain Key    ${wrong_password}    access_token
    ${unknown_user}=    Login With Credentials    gm-qa-no-such-user-20261111    robot-test-only-123    401
    Dictionary Should Not Contain Key    ${unknown_user}    access_token
    ${missing_identifier}=    Create Dictionary    password=${ROBOT_TEST_PASSWORD}
    ${missing_identifier_response}=    POST On Session    graphmind    /api/v1/auth/login    json=${missing_identifier}    expected_status=422
    Should Be Equal As Integers    ${missing_identifier_response.status_code}    422
    ${missing_password}=    Create Dictionary    identifier=robot-user
    ${missing_password_response}=    POST On Session    graphmind    /api/v1/auth/login    json=${missing_password}    expected_status=422
    Should Be Equal As Integers    ${missing_password_response.status_code}    422
    ${empty_fields}=    Create Dictionary    identifier=${EMPTY}    password=${EMPTY}
    ${empty_response}=    POST On Session    graphmind    /api/v1/auth/login    json=${empty_fields}    expected_status=any
    Should Not Be Equal As Integers    ${empty_response.status_code}    200
    ${no_token}=    GET On Session    graphmind    /api/v1/auth/me    expected_status=401
    Should Be Equal As Integers    ${no_token.status_code}    401
    ${user_headers}=    Authorization Headers    ${USER_TOKEN}
    ${forbidden}=    GET On Session    graphmind    /api/v1/admin/users    headers=${user_headers}    expected_status=403
    Should Be Equal As Integers    ${forbidden.status_code}    403

RBAC Check Applies Department And Role Rules
    [Documentation]    Checks department boundaries, manager SOP publishing in-scope/out-of-scope, and Executive/Admin unrestricted access.
    ${sales_legal}=    Check RBAC    standard    ops    sales    legal    contract    read
    Should Be Equal    ${sales_legal}[allowed]    ${False}
    Should Be Equal    ${sales_legal}[rule]    BR-02
    ${sales_sales}=    Check RBAC    standard    ops    sales    sales    contract    read
    Should Be Equal    ${sales_sales}[allowed]    ${True}
    ${manager_sales}=    Check RBAC    knowledge_manager    manager    sales    sales    sop    publish
    Should Be Equal    ${manager_sales}[allowed]    ${True}
    ${manager_other_department}=    Check RBAC    knowledge_manager    manager    sales    legal    sop    publish
    Should Be Equal    ${manager_other_department}[allowed]    ${False}
    Should Be Equal    ${manager_other_department}[rule]    BR-04
    ${executive_it}=    Check RBAC    executive    exec    executive    it    contract    read
    Should Be Equal    ${executive_it}[allowed]    ${True}
    ${admin_legal}=    Check RBAC    it_admin    admin    it_admin    legal    document    delete
    Should Be Equal    ${admin_legal}[allowed]    ${True}
    ${standard_publish}=    Check RBAC    standard    ops    sales    sales    sop    publish
    Should Be Equal    ${standard_publish}[allowed]    ${False}
    Should Be Equal    ${standard_publish}[rule]    BR-04

Admin User Lifecycle Validates Role Lock Reset Audit And Cleanup
    [Documentation]    Creates a disposable user, checks duplicate/validation, role change, lock/unlock, password reset, audit events, and deletes the fixture.
    Set Test Variable    ${CREATED_USER_ID}    ${EMPTY}
    Set Test Variable    ${CREATED_EMAIL}    ${EMPTY}
    ${suffix}=    Evaluate    __import__('uuid').uuid4().hex[:10]
    ${email}=    Set Variable    gm-qa-lifecycle-${suffix}@graphmind.test
    Set Test Variable    ${CREATED_EMAIL}    ${email}
    ${password}=    Set Variable    Robot-Old-${suffix}
    ${new_password}=    Set Variable    Robot-New-${suffix}
    ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${payload}=    Create Dictionary    email=${email}    password=${password}    full_name=GM QA Lifecycle    role=standard
    ${created}=    POST On Session    graphmind    /api/v1/admin/users    json=${payload}    headers=${headers}    expected_status=201
    ${created_body}=    Evaluate    $created.json()
    ${user_id}=    Get From Dictionary    ${created_body}    user_id
    Set Test Variable    ${CREATED_USER_ID}    ${user_id}
    Should Be Equal    ${created_body}[role]    standard
    Should Be Equal    ${created_body}[status]    active

    ${duplicate}=    POST On Session    graphmind    /api/v1/admin/users    json=${payload}    headers=${headers}    expected_status=409
    Should Be Equal As Integers    ${duplicate.status_code}    409
    ${invalid}=    Create Dictionary    email=not-an-email    password=short    role=hacker
    ${invalid_response}=    POST On Session    graphmind    /api/v1/admin/users    json=${invalid}    headers=${headers}    expected_status=422
    Should Be Equal As Integers    ${invalid_response.status_code}    422

    ${user_login}=    Login With Credentials    ${email}    ${password}    200
    ${user_token}=    Get From Dictionary    ${user_login}    access_token
    ${user_headers}=    Authorization Headers    ${user_token}
    ${denied}=    GET On Session    graphmind    /api/v1/admin/users    headers=${user_headers}    expected_status=403
    Should Be Equal As Integers    ${denied.status_code}    403

    ${role_payload}=    Create Dictionary    role=knowledge_manager
    ${role_response}=    PATCH On Session    graphmind    /api/v1/admin/users/${user_id}/role    json=${role_payload}    headers=${headers}    expected_status=200
    Should Be Equal    ${role_response.json()}[role]    knowledge_manager
    ${self_role_payload}=    Create Dictionary    role=standard
    ${self_role}=    PATCH On Session    graphmind    /api/v1/admin/users/${ADMIN_USER_ID}/role    json=${self_role_payload}    headers=${headers}    expected_status=400
    Should Be Equal As Integers    ${self_role.status_code}    400

    ${locked}=    PATCH On Session    graphmind    /api/v1/admin/users/${user_id}/lock    headers=${headers}    expected_status=200
    Should Be Equal    ${locked.json()}[status]    locked
    Should Be Equal    ${locked.json()}[is_active]    ${False}
    ${locked_login}=    Login With Credentials    ${email}    ${password}    403
    Dictionary Should Not Contain Key    ${locked_login}    access_token
    ${old_token_after_lock}=    GET On Session    graphmind    /api/v1/auth/me    headers=${user_headers}    expected_status=403
    Should Be Equal As Integers    ${old_token_after_lock.status_code}    403

    ${unlocked}=    PATCH On Session    graphmind    /api/v1/admin/users/${user_id}/unlock    headers=${headers}    expected_status=200
    Should Be Equal    ${unlocked.json()}[status]    active
    ${reset_payload}=    Create Dictionary    new_password=${new_password}
    ${reset}=    PATCH On Session    graphmind    /api/v1/admin/users/${user_id}/reset-password    json=${reset_payload}    headers=${headers}    expected_status=200
    Dictionary Should Not Contain Key    ${reset.json()}    password_hash
    ${old_password}=    Login With Credentials    ${email}    ${password}    401
    Dictionary Should Not Contain Key    ${old_password}    access_token
    ${new_password_login}=    Login With Credentials    ${email}    ${new_password}    200
    Dictionary Should Not Contain Key    ${new_password_login}    password_hash

    ${audit_query}=    Create Dictionary    resource_type=user    limit=200
    ${audit_response}=    GET On Session    graphmind    /api/v1/admin/audit-logs    params=${audit_query}    headers=${headers}    expected_status=200
    ${audit_items}=    Set Variable    ${audit_response.json()}[items]
    ${actions}=    Create List
    FOR    ${item}    IN    @{audit_items}
        ${resource_id}=    Get From Dictionary    ${item}    resource_id
        IF    '${resource_id}' == '${user_id}'
            Append To List    ${actions}    ${item}[action]
        END
    END
    List Should Contain Value    ${actions}    USER_CREATE
    List Should Contain Value    ${actions}    ROLE_CHANGE
    List Should Contain Value    ${actions}    USER_LOCK
    List Should Contain Value    ${actions}    USER_UNLOCK
    List Should Contain Value    ${actions}    PASSWORD_RESET

    ${deleted}=    DELETE On Session    graphmind    /api/v1/admin/users/${user_id}    headers=${headers}    expected_status=204
    Should Be Equal As Integers    ${deleted.status_code}    204
    Set Test Variable    ${CREATED_USER_ID}    ${EMPTY}
    ${deleted_login}=    Login With Credentials    ${email}    ${new_password}    401
    Dictionary Should Not Contain Key    ${deleted_login}    access_token
    [Teardown]    Cleanup Test User    ${CREATED_USER_ID}

Admin Cannot Delete Or Lock Its Own Account
    [Documentation]    Confirms the signed-in administrator cannot self-lock, change own role, or delete its own account.
    ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
    ${lock}=    PATCH On Session    graphmind    /api/v1/admin/users/${ADMIN_USER_ID}/lock    headers=${headers}    expected_status=400
    Should Be Equal As Integers    ${lock.status_code}    400
    ${role}=    Create Dictionary    role=standard
    ${role_change}=    PATCH On Session    graphmind    /api/v1/admin/users/${ADMIN_USER_ID}/role    json=${role}    headers=${headers}    expected_status=400
    Should Be Equal As Integers    ${role_change.status_code}    400
    ${delete}=    DELETE On Session    graphmind    /api/v1/admin/users/${ADMIN_USER_ID}    headers=${headers}    expected_status=400
    Should Be Equal As Integers    ${delete.status_code}    400

*** Keywords ***
Connect To Staging And Login
    Should Be Equal    ${API_URL}    http://127.0.0.1:15000    M6 tests require the isolated Robot staging API.
    Create Session    graphmind    ${API_URL}
    ${admin}=    Login With Credentials    admin    ${ROBOT_TEST_PASSWORD}    200
    Set Suite Variable    ${ADMIN_TOKEN}    ${admin}[access_token]
    Set Suite Variable    ${ADMIN_USER_ID}    ${admin}[user][id]
    ${user}=    Login With Credentials    robot-user    ${ROBOT_TEST_PASSWORD}    200
    Set Suite Variable    ${USER_TOKEN}    ${user}[access_token]

Login With Credentials
    [Arguments]    ${identifier}    ${password}    ${expected_status}
    ${payload}=    Create Dictionary    identifier=${identifier}    password=${password}
    ${response}=    POST On Session    graphmind    /api/v1/auth/login    json=${payload}    expected_status=${expected_status}
    RETURN    ${response.json()}

Authorization Headers
    [Arguments]    ${token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}
    RETURN    ${headers}

Check RBAC
    [Arguments]    ${role}    ${username}    ${user_department}    ${target_department}    ${resource_type}    ${action}
    ${headers}=    Create Dictionary    X-User-Role=${role}    X-User-Name=${username}    X-User-Dept=${user_department}
    ${payload}=    Create Dictionary    department=${target_department}    resource_type=${resource_type}    action=${action}
    ${response}=    POST On Session    graphmind    /api/v1/rbac/check    json=${payload}    headers=${headers}    expected_status=200
    RETURN    ${response.json()}

Cleanup Test User
    [Arguments]    ${user_id}=${EMPTY}
    IF    not $user_id
        ${user_id}=    Get Variable Value    \${CREATED_USER_ID}    ${EMPTY}
    END
    IF    $user_id
        ${headers}=    Authorization Headers    ${ADMIN_TOKEN}
        ${response}=    DELETE On Session    graphmind    /api/v1/admin/users/${user_id}    headers=${headers}    expected_status=any
        Should Be True    $response.status_code in (204, 404)
    END
