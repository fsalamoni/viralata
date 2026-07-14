# Auditoria de Dependências (TASK-032)

**Data**: 2026-07-14
**Comando**: `npm audit --json`
**Total**: 18 vulnerabilidades (0 info, 1 low, 10 moderate, 6 high, 1 critical)

## Resumo por severidade

| Severidade | Total | Bloqueante |
|------------|-------|------------|
| Critical | 1 (jspdf) | ⚠️ **SIM** |
| High | 6 | ❌ NÃO (transitivo) |
| Moderate | 10 | ❌ NÃO |
| Low | 1 | ❌ NÃO |

## Pacote crítico: jspdf (8 vulnerabilidades)

- **Versão atual**: ≤ 3.0.x
- **Versão segura**: ≥ 4.2.0
- **CVE**: ReDoS, DoS, LFI, XSS, PDF Injection, Race Condition, GIF DoS
- **Impacto viralata**: gera PDF de relatórios (ReportsTab → exportToPDF)
- **Recomendação**: atualizar para jspdf@4.2.0+

```
npm install jspdf@^4.2.0
```

## Pacotes high (transitivos — bloqueio em CI)

| Pacote | Severidade | Issue | Range | Fix |
|--------|-----------|-------|-------|-----|
| @grpc/grpc-js | high | DoS via malformed request | <1.14.4 | 1.14.4+ |
| form-data | high | CRLF injection | <4.0.6 | 4.0.6+ |
| protobufjs | high | DoS recursive expansion | <=7.5.7 | 7.5.8+ |

**Ação**: solicitar PR de bump em CI quando atualizado.

## Plano de ação

1. **P0 (esta semana)**: bump `jspdf@^4.2.0` + validar exportToPDF
2. **P1 (próxima sprint)**: bump `protobufjs`, `form-data`
3. **P2 (monitorar)**: @grpc/grpc-js (não usamos diretamente)

## CI

Adicionar step em `.github/workflows/ci.yml`:
```yaml
- name: npm audit (moderate+)
  run: npm audit --audit-level=moderate
```

**Política**: bloqueia merge se `critical` ou `high`.

## Histórico

| Data | Total | Crítico | Status |
|------|-------|---------|--------|
| 2026-07-14 | 18 | 1 | aberto |
