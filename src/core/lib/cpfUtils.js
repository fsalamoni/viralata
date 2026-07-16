/** Validação CPF módulo 11 (P4 — sem API Receita). */
export function computeCpfDigit(digits) {
  const nums = String(digits).split('').map(Number);
  let sum = 0, weight = nums.length + 1;
  for (const n of nums) { sum += n * weight; weight--; }
  return sum % 11 < 2 ? 0 : 11 - (sum % 11);
}
export function isValidCpf(cpf) {
  if (!cpf) return false;
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  return digits[9] === String(computeCpfDigit(digits.slice(0, 9))) && digits[10] === String(computeCpfDigit(digits.slice(0, 10)));
}
export function formatCpf(cpf) {
  const d = String(cpf || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}
export default { isValidCpf, computeCpfDigit, formatCpf };
