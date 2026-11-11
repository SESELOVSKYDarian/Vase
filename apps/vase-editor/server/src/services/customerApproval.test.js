import assert from 'node:assert/strict';
import test from 'node:test';

import { initialMembershipStatus } from './customerApproval.js';

test('sin ajuste o con aprobación a mano: todos quedan pendientes', () => {
  assert.equal(initialMembershipStatus(null, 'retail'), 'pending');
  assert.equal(initialMembershipStatus({}, 'retail'), 'pending');
  assert.equal(initialMembershipStatus({ manual_approval: true }, 'retail'), 'pending');
  assert.equal(initialMembershipStatus({ manual_approval: 'false' }, 'retail'), 'pending');
});

test('con aprobación automática: minoristas activos, mayoristas pendientes', () => {
  assert.equal(initialMembershipStatus({ manual_approval: false }, 'retail'), 'active');
  assert.equal(initialMembershipStatus({ manual_approval: false }, 'wholesale'), 'pending');
  assert.equal(initialMembershipStatus({ manual_approval: false }, 'tenant_admin'), 'pending');
});

test('si la tienda lo elige, los mayoristas también entran solos', () => {
  assert.equal(initialMembershipStatus({ manual_approval: false, auto_approve_wholesale: true }, 'wholesale'), 'active');
  assert.equal(initialMembershipStatus({ manual_approval: false, auto_approve_wholesale: 'true' }, 'wholesale'), 'pending');
  assert.equal(initialMembershipStatus({ manual_approval: true, auto_approve_wholesale: true }, 'wholesale'), 'pending');
  assert.equal(initialMembershipStatus({ manual_approval: false, auto_approve_wholesale: true }, 'tenant_admin'), 'pending');
});
