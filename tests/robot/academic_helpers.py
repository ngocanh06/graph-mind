"""
Academic Test Helper Library for Robot Framework
Simulates and verifies GraphMind RBAC & Ingestion pipelines
"""
import os
import re

def simulate_rbac_check(role, user_dept, target_dept, resource_type, action, allowed_depts=None):
    if allowed_depts is None:
        allowed_depts = []
    
    role = str(role).lower()
    user_dept = str(user_dept).lower()
    target_dept = str(target_dept).lower() if target_dept and str(target_dept) != 'None' else ''
    resource_type = str(resource_type).lower() if resource_type else ''
    action = str(action).lower() if action else 'read'

    # Line 1: Check Executive / Admin
    if role in ['executive', 'admin', 'ceo', 'cfo']:
        return {'allowed': True, 'rule': 'BR-05', 'detail': 'Executive full enterprise access'}

    # Line 2: Check Executive feature
    if resource_type in ['kpi', 'executive_dashboard', 'briefing']:
        return {'allowed': False, 'rule': 'BR-05', 'detail': 'Executive only resource'}

    # Line 3: SOP Publishing
    if resource_type == 'sop' and action in ['publish', 'write']:
        if role in ['standard_user', 'standard', 'ops', 'sales_ops', 'staff']:
            return {'allowed': False, 'rule': 'BR-04', 'detail': 'Staff cannot publish SOP'}

    # Line 4: Department scope
    if target_dept:
        if user_dept == target_dept:
            return {'allowed': True, 'rule': 'BR-02', 'detail': 'Department access granted'}
        
        # Loop over allowed_depts
        for d in allowed_depts:
            if str(d).lower() == target_dept:
                return {'allowed': True, 'rule': 'BR-02', 'detail': 'Cross-department whitelist match'}
        
        return {'allowed': False, 'rule': 'BR-02', 'detail': 'Department mismatch denied'}

    return {'allowed': True, 'rule': 'DEFAULT', 'detail': 'Access permitted'}

def simulate_ingestion_validation(filename, filesize_bytes, dept, role):
    valid_exts = ['.pdf', '.docx', '.xlsx', '.csv', '.txt']
    valid_depts = ['executive', 'legal', 'sales', 'it', 'rd']

    filesize_bytes = int(filesize_bytes)
    if filesize_bytes <= 0:
        return {'status': 400, 'message': 'File is empty'}
    if filesize_bytes > 52428800:
        return {'status': 413, 'message': 'Payload Too Large'}

    if not filename or len(filename.strip()) == 0:
        return {'status': 400, 'message': 'Filename required'}
    if len(filename) > 255:
        return {'status': 400, 'message': 'Filename too long'}

    # Check extension
    _, ext = os.path.splitext(filename)
    if not ext or ext.lower() not in valid_exts:
        return {'status': 400, 'message': 'Unsupported file format'}

    if not dept or dept.lower() not in valid_depts:
        return {'status': 400, 'message': 'Invalid department'}

    if role.lower() not in ['manager', 'admin', 'executive', 'lead']:
        return {'status': 403, 'message': 'Forbidden upload permission'}

    return {'status': 200, 'message': 'File ingested successfully'}

