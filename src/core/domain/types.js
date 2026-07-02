/**
 * @fileoverview Typedefs JSDoc compartilhados — Viralata
 */

/** @typedef {'user' | 'platform_admin'} UserRole */
/** @typedef {'house_with_yard' | 'house_no_yard' | 'apartment_screened' | 'apartment_unscreened' | 'farm'} HousingType */
/** @typedef {'none' | 'short' | 'long'} DailyWalks */
/** @typedef {'basic' | 'moderate' | 'high'} BudgetLevel */
/** @typedef {'dog' | 'cat' | 'rabbit' | 'bird' | 'other'} PetSpecies */
/** @typedef {'mini' | 'small' | 'medium' | 'large' | 'giant'} PetSize */
/** @typedef {'puppy' | 'adult' | 'senior'} PetAgeGroup */
/** @typedef {'male' | 'female'} PetGender */
/** @typedef {'yes' | 'no' | 'partial'} VaccinationStatus */
/** @typedef {'available' | 'in_process' | 'adopted'} PetStatus */
/** @typedef {'user' | 'organization'} OwnerType */
/** @typedef {'pending' | 'chat_opened' | 'rejected' | 'adopted'} InterestStatus */
/** @typedef {'admin' | 'member'} OrgRole */
/** @typedef {'pending' | 'investigating' | 'resolved'} ReportStatus */

export const PLATFORM_ROLES = ['user', 'platform_admin'];
export const PET_SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'other'];
export const PET_SIZES = ['mini', 'small', 'medium', 'large', 'giant'];
export const PET_AGE_GROUPS = ['puppy', 'adult', 'senior'];
export const PET_STATUSES = ['available', 'in_process', 'adopted'];
export const ORG_ROLES = ['admin', 'member'];
