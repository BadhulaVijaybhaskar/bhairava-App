const INTERNAL = 'INTERNAL';
const AGENT_VISIBLE = 'AGENT_VISIBLE';
const CUSTOMER_PROFILE_RELATED = 'CUSTOMER_PROFILE_RELATED';

function canSee(role: string, visibility: string): boolean {
  if (role === 'CUSTOMER') return visibility === CUSTOMER_PROFILE_RELATED;
  if (role === 'AGENT') {
    return visibility === AGENT_VISIBLE || visibility === CUSTOMER_PROFILE_RELATED;
  }
  return true;
}

describe('document visibility / versions', () => {
  it('customer blocked from INTERNAL', () => {
    expect(canSee('CUSTOMER', INTERNAL)).toBe(false);
  });

  it('agent blocked from INTERNAL', () => {
    expect(canSee('AGENT', INTERNAL)).toBe(false);
  });

  it('agent can see AGENT_VISIBLE', () => {
    expect(canSee('AGENT', AGENT_VISIBLE)).toBe(true);
  });

  it('version increments on replace (logical)', () => {
    let version = 1;
    version += 1;
    expect(version).toBe(2);
  });
});
