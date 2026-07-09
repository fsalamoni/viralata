import { describe, it, expect } from 'vitest';
import {
  PRIVACY_LEVEL,
  MEMBER_FIELD,
  MEMBER_FIELD_DEFAULT_PRIVACY,
  meetsPrivacy,
} from './constants.js';
import {
  fieldPrivacy,
  canViewField,
  filterMemberForViewer,
  visibleFields,
  hiddenFields,
  normalizePrivacyMap,
} from './privacy.js';

const baseMember = {
  user_id: 'u1',
  user_name: 'Maria',
  user_email: 'maria@x.com',
  phone: '31999990000',
  whatsapp: '31999990000',
  title: 'Veterinária',
  bio: 'Cuida dos animais',
  history: 'Na ONG desde 2018',
  photo_url: 'https://example.com/maria.png',
};

const baseClub = { id: 'c1', created_by: 'owner' };

describe('privacy.constants', () => {
  it('mapeia default por campo', () => {
    expect(MEMBER_FIELD_DEFAULT_PRIVACY[MEMBER_FIELD.EMAIL]).toBe(PRIVACY_LEVEL.MEMBERS);
    expect(MEMBER_FIELD_DEFAULT_PRIVACY[MEMBER_FIELD.WHATSAPP]).toBe(PRIVACY_LEVEL.FOLLOWERS);
    expect(MEMBER_FIELD_DEFAULT_PRIVACY[MEMBER_FIELD.FULL_NAME]).toBe(PRIVACY_LEVEL.PUBLIC);
  });

  it('meetsPrivacy respeita a hierarquia', () => {
    expect(meetsPrivacy(PRIVACY_LEVEL.PUBLIC, PRIVACY_LEVEL.PUBLIC)).toBe(true);
    expect(meetsPrivacy(PRIVACY_LEVEL.MEMBERS, PRIVACY_LEVEL.PUBLIC)).toBe(true);
    expect(meetsPrivacy(PRIVACY_LEVEL.PUBLIC, PRIVACY_LEVEL.MEMBERS)).toBe(false);
    expect(meetsPrivacy(PRIVACY_LEVEL.MEMBERS, PRIVACY_LEVEL.FOLLOWERS)).toBe(true);
  });
});

describe('fieldPrivacy', () => {
  it('usa o default quando privacy_map não define', () => {
    expect(fieldPrivacy(baseMember, MEMBER_FIELD.EMAIL)).toBe(PRIVACY_LEVEL.MEMBERS);
    expect(fieldPrivacy(baseMember, MEMBER_FIELD.WHATSAPP)).toBe(PRIVACY_LEVEL.FOLLOWERS);
  });
  it('sobrescreve com privacy_map explícito', () => {
    const m = { ...baseMember, privacy_map: { email: PRIVACY_LEVEL.PUBLIC } };
    expect(fieldPrivacy(m, MEMBER_FIELD.EMAIL)).toBe(PRIVACY_LEVEL.PUBLIC);
  });
});

describe('canViewField', () => {
  it('PUBLIC é visto por qualquer um', () => {
    expect(canViewField({ member: baseMember, field: MEMBER_FIELD.TITLE, viewer: null, club: baseClub })).toBe(true);
  });
  it('FOLLOWERS exige seguidor ou membro', () => {
    expect(canViewField({ member: baseMember, field: MEMBER_FIELD.WHATSAPP, viewer: null, club: baseClub })).toBe(false);
    expect(canViewField({ member: baseMember, field: MEMBER_FIELD.WHATSAPP, viewer: { isFollower: true }, club: baseClub })).toBe(true);
    expect(canViewField({ member: baseMember, field: MEMBER_FIELD.WHATSAPP, viewer: { isMemberOfClub: true }, club: baseClub })).toBe(true);
  });
  it('MEMBERS exige membro da ONG', () => {
    expect(canViewField({ member: baseMember, field: MEMBER_FIELD.EMAIL, viewer: { isFollower: true }, club: baseClub })).toBe(false);
    expect(canViewField({ member: baseMember, field: MEMBER_FIELD.EMAIL, viewer: { isMemberOfClub: true }, club: baseClub })).toBe(true);
  });
  it('PRIVATE só o próprio membro', () => {
    const m = { ...baseMember, privacy_map: { phone: PRIVACY_LEVEL.PRIVATE } };
    expect(canViewField({ member: m, field: MEMBER_FIELD.PHONE, viewer: { isMemberOfClub: true, uid: 'other' }, club: baseClub })).toBe(false);
    expect(canViewField({ member: m, field: MEMBER_FIELD.PHONE, viewer: { isMemberOfClub: true, uid: 'u1' }, club: baseClub })).toBe(true);
  });
});

describe('filterMemberForViewer', () => {
  it('remove campos que o viewer não pode ver', () => {
    const out = filterMemberForViewer(baseMember, { viewer: { isFollower: true }, club: baseClub });
    // email/phone (members) ocultos; whatsapp (followers) e demais visíveis.
    expect(out.user_email).toBe('');
    expect(out.phone).toBe('');
    expect(out.whatsapp).toBe('31999990000');
    expect(out.user_name).toBe('Maria');
  });
  it('membro da ONG vê tudo (exceto o que é PRIVATE)', () => {
    const out = filterMemberForViewer(baseMember, { viewer: { isMemberOfClub: true, uid: 'other' }, club: baseClub });
    expect(out.user_email).toBe('maria@x.com');
    expect(out.phone).toBe('31999990000');
  });
});

describe('visibleFields / hiddenFields', () => {
  it('lista os campos visíveis e ocultos', () => {
    const visible = visibleFields({ member: baseMember, viewer: null, club: baseClub });
    const hidden = hiddenFields({ member: baseMember, viewer: null, club: baseClub });
    expect(visible).toContain(MEMBER_FIELD.FULL_NAME);
    expect(visible).toContain(MEMBER_FIELD.PHOTO);
    expect(visible).toContain(MEMBER_FIELD.TITLE);
    expect(hidden).toContain(MEMBER_FIELD.EMAIL);
    expect(hidden).toContain(MEMBER_FIELD.PHONE);
  });
});

describe('normalizePrivacyMap', () => {
  it('preenche todos os campos com default se ausentes', () => {
    const out = normalizePrivacyMap({});
    Object.values(MEMBER_FIELD).forEach((f) => {
      expect(Object.values(PRIVACY_LEVEL)).toContain(out[f]);
    });
  });
  it('mantém valores válidos e substitui inválidos', () => {
    const out = normalizePrivacyMap({ email: 'invalid', whatsapp: PRIVACY_LEVEL.PUBLIC });
    expect(out.email).toBe(MEMBER_FIELD_DEFAULT_PRIVACY[MEMBER_FIELD.EMAIL]);
    expect(out.whatsapp).toBe(PRIVACY_LEVEL.PUBLIC);
  });
});
