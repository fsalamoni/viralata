import { describe, it, expect } from 'vitest';
import { validateAndMapRows } from './petImport.js';

describe('organizations/petImport domain', () => {
  describe('validateAndMapRows', () => {
    const validRow = {
      Título: 'Bidu, cachorro dócil',
      Espécie: 'Cachorro',
      Porte: 'Médio',
      Idade: 'Adulto',
      Sexo: 'Macho',
      Vacinação: 'Sim',
      Cidade: 'Belo Horizonte',
      Estado: 'MG',
    };

    it('maps a fully valid row with Portuguese enum labels into the pets schema', () => {
      const { toInsert, duplicates, errors } = validateAndMapRows([validRow], []);
      expect(errors).toHaveLength(0);
      expect(duplicates).toHaveLength(0);
      expect(toInsert).toHaveLength(1);
      expect(toInsert[0].petData).toMatchObject({
        title: 'Bidu, cachorro dócil',
        species: 'dog',
        size: 'medium',
        age_group: 'adult',
        gender: 'male',
        vaccinated: 'yes',
        city: 'Belo Horizonte',
        state: 'MG',
        status: 'available',
      });
    });

    it('also accepts English enum values and explicit status', () => {
      const row = { ...validRow, Espécie: 'dog', Porte: 'medium', Status: 'Em processo' };
      const { toInsert, errors } = validateAndMapRows([row], []);
      expect(errors).toHaveLength(0);
      expect(toInsert[0].petData.status).toBe('in_process');
    });

    it('collects one error per missing/invalid required field, all pointing at the same row', () => {
      const row = { ...validRow, Título: '', Espécie: 'peixe-boi', Porte: '' };
      const { errors, toInsert } = validateAndMapRows([row], []);
      expect(toInsert).toHaveLength(0);
      const fields = errors.map((e) => e.field);
      expect(fields).toContain('Título');
      expect(fields).toContain('Espécie');
      expect(fields).toContain('Porte');
      errors.forEach((e) => expect(e.row).toBe(2)); // linha 1 = cabeçalho
    });

    it('treats a row whose ID matches an existing pet as a duplicate, defaulting to "keep"', () => {
      const existing = [{ id: 'pet-1', title: 'Bidu (já cadastrado)' }];
      const row = { ...validRow, ID: 'pet-1' };
      const { duplicates, toInsert, errors } = validateAndMapRows([row], existing);
      expect(errors).toHaveLength(0);
      expect(toInsert).toHaveLength(0);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toMatchObject({ id: 'pet-1', action: 'keep' });
    });

    it('treats an ID that does not match any existing pet as a new insert', () => {
      const existing = [{ id: 'pet-1', title: 'Outro pet' }];
      const row = { ...validRow, ID: 'pet-does-not-exist' };
      const { duplicates, toInsert } = validateAndMapRows([row], existing);
      expect(duplicates).toHaveLength(0);
      expect(toInsert).toHaveLength(1);
    });

    it('processes multiple rows independently, mixing inserts/duplicates/errors', () => {
      const existing = [{ id: 'pet-1', title: 'Já cadastrado' }];
      const rows = [
        validRow,
        { ...validRow, ID: 'pet-1' },
        { ...validRow, Sexo: 'valor-invalido' },
      ];
      const { toInsert, duplicates, errors } = validateAndMapRows(rows, existing);
      expect(toInsert).toHaveLength(1);
      expect(duplicates).toHaveLength(1);
      expect(errors).toHaveLength(1);
      expect(errors[0].row).toBe(4);
    });

    describe('campos internos do abrigo', () => {
      it('mapeia os campos internos preenchidos para o schema do pet', () => {
        const row = {
          ...validRow,
          RG: 'RG-123',
          Microchip: '981000012345678',
          'ID abrigo': 'A-42',
          'Idade aparente (anos)': '3',
          Castrado: 'Sim',
          Vermifugado: 'Não',
          Energia: 'Alta',
          'Localização atual': 'Em lar temporário',
          'Responsável resgate': 'Maria',
          'Local resgate': 'Rua X, 100',
          Observações: 'observação livre',
        };
        const { toInsert, errors } = validateAndMapRows([row], []);
        expect(errors).toHaveLength(0);
        expect(toInsert[0].petData).toMatchObject({
          national_pet_id: 'RG-123',
          microchip: '981000012345678',
          shelter_internal_id: 'A-42',
          apparent_age_years: 3,
          neutered: true,
          dewormed: false,
          energy_level: 'high',
          current_location: 'foster',
          rescue_responsible_name: 'Maria',
          rescue_address: 'Rua X, 100',
          observations: 'observação livre',
        });
      });

      it('preserva o booleano false em Castrado/Vermifugado (não vira null nem some)', () => {
        const row = { ...validRow, Castrado: 'Não', Vermifugado: 'Não' };
        const { toInsert } = validateAndMapRows([row], []);
        expect(toInsert[0].petData.neutered).toBe(false);
        expect(toInsert[0].petData.dewormed).toBe(false);
      });

      it('não inclui campos internos quando as colunas estão vazias', () => {
        const { toInsert } = validateAndMapRows([validRow], []);
        const petData = toInsert[0].petData;
        expect(petData).not.toHaveProperty('national_pet_id');
        expect(petData).not.toHaveProperty('neutered');
        expect(petData).not.toHaveProperty('current_location');
        expect(petData).not.toHaveProperty('observations');
      });
    });
  });
});
