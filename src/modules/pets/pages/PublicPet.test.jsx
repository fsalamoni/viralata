/**
 * @fileoverview Tests da PublicPet (TASK-180).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mocks Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, ...path) => ({ _path: path.join('/') })),
  getDoc: vi.fn(),
  collection: vi.fn((db, name) => ({ _path: name })),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('@/core/config/firebase', () => ({
  db: {},
}));

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: null, userProfile: null }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock SEO
vi.mock('@/components/Seo', () => ({
  default: () => null,
}));

// Mock UI
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...rest }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, { ...rest });
    }
    return <button {...rest}>{children}</button>;
  },
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }) => <span className={className}>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }) => <div>{children}</div>,
  AvatarImage: (props) => <img {...props} />,
  AvatarFallback: ({ children }) => <div>{children}</div>,
}));

// Imports DEPOIS dos mocks
import { getDoc } from 'firebase/firestore';
import PublicPet from './PublicPet';

let container;
let root;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

function renderAtRoute(path) {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/pet/:petId" element={<PublicPet />} />
        </Routes>
      </MemoryRouter>
    );
  });
}

function mockPetSnap(petId, data, exists = true) {
  getDoc.mockResolvedValueOnce({
    id: petId,
    exists: () => exists,
    data: () => data,
  });
}

describe('PublicPet — estados de carregamento', () => {
  it('mostra skeletons durante o loading inicial', async () => {
    getDoc.mockReturnValue(new Promise(() => {})); // nunca resolve
    await act(async () => {
      renderAtRoute('/pet/abc-123');
    });
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('mostra "Pet não encontrado" se doc não existe', async () => {
    mockPetSnap('inexistente', null, false);
    await act(async () => {
      renderAtRoute('/pet/inexistente');
    });
    expect(container.textContent).toContain('Pet não encontrado');
  });
});

describe('PublicPet — render com pet válido', () => {
  it('renderiza nome do pet', async () => {
    mockPetSnap('pet-1', {
      title: 'Rex',
      species: 'dog',
      size: 'medium',
      age_group: 'adult',
      gender: 'male',
      city: 'São Paulo',
      state: 'SP',
      status: 'available',
      description: 'Cachorro muito dócil',
      photos: ['https://example.com/photo.jpg'],
    });
    await act(async () => {
      renderAtRoute('/pet/pet-1');
    });
    expect(container.textContent).toContain('Rex');
  });

  it('mostra badge de status "Disponível"', async () => {
    mockPetSnap('pet-1', {
      title: 'Rex', species: 'dog', status: 'available', photos: [],
    });
    await act(async () => {
      renderAtRoute('/pet/pet-1');
    });
    expect(container.textContent).toContain('Disponível');
  });

  it('mostra badge de status "Adotado" se status=adopted', async () => {
    mockPetSnap('pet-1', {
      title: 'Rex', species: 'dog', status: 'adopted', photos: [],
    });
    await act(async () => {
      renderAtRoute('/pet/pet-1');
    });
    expect(container.textContent).toContain('Adotado');
  });

  it('mostra localização (cidade, UF)', async () => {
    mockPetSnap('pet-1', {
      title: 'Rex', species: 'dog', city: 'Rio de Janeiro', state: 'RJ', photos: [],
    });
    await act(async () => {
      renderAtRoute('/pet/pet-1');
    });
    expect(container.textContent).toContain('Rio de Janeiro');
    expect(container.textContent).toContain('RJ');
  });

  it('mostra descrição se presente', async () => {
    mockPetSnap('pet-1', {
      title: 'Rex', species: 'dog', description: 'Muito carinhoso e brincalhão', photos: [],
    });
    await act(async () => {
      renderAtRoute('/pet/pet-1');
    });
    expect(container.textContent).toContain('Muito carinhoso e brincalhão');
  });

  it('mostra CTAs de adoção e chat', async () => {
    mockPetSnap('pet-1', { title: 'Rex', species: 'dog', status: 'available', photos: [] });
    await act(async () => {
      renderAtRoute('/pet/pet-1');
    });
    expect(container.textContent).toContain('Quero adotar');
    expect(container.textContent).toContain('Falar com o abrigo');
  });
});

describe('PublicPet — info de saúde pública', () => {
  it('mostra card de saúde com vaccination=Sim quando vaccinated=yes', async () => {
    mockPetSnap('pet-1', {
      title: 'Rex', species: 'dog', vaccinated: 'yes', photos: [],
    });
    await act(async () => {
      renderAtRoute('/pet/pet-1');
    });
    expect(container.textContent).toContain('Vacinação');
    expect(container.textContent).toContain('Sim');
  });

  it('mostra castrado=Sim quando neutered=true', async () => {
    mockPetSnap('pet-1', {
      title: 'Rex', species: 'dog', neutered: true, photos: [],
    });
    await act(async () => {
      renderAtRoute('/pet/pet-1');
    });
    expect(container.textContent).toContain('Castrado');
    expect(container.textContent).toContain('Sim');
  });
});
