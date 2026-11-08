-- Tope de la copia en la nube: de 30 MB a 10 MB (auditoría de seguridad de 2026-11, docs/auditoria-seguridad-2026-11/ESTADO.md, punto 2).
-- Cada cuenta puede ocupar el doble del tope (la copia y la anterior, que se guarda 7 días) y las cuentas se crean con
-- cualquier email: con 30 MB, unas 8 cuentas hechas a propósito llenaban los 500 MB del plan gratuito de Supabase; con
-- 10 MB hacen falta unas 25. Una copia real, comprimida y cifrada, ocupa unos 2,5 MB con tres años de uso intenso con GPS
-- (menos de 1 MB sin GPS), así que 10 MB deja margen de sobra.
--
-- Ejecutar en el SQL Editor del proyecto, después de 0032. Antes, comprobar que ninguna copia lo supera:
--   select count(*) from public.copias where tamano > 10000000;
-- Si sale más de 0, no ejecutarla y avisar: el tope nuevo fallaría y no se cambiaría nada (va en una transacción).
-- La app no necesita esta migración para funcionar: solo cambia el texto del aviso de copia demasiado grande.
-- Se deshace volviendo a 30000000 con el mismo par de sentencias.

begin;
alter table public.copias drop constraint copias_tamano_check;
alter table public.copias add constraint copias_tamano_check check (tamano <= 10000000);
commit;
