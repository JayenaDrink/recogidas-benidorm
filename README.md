# Recogidas Benidorm

Calendario compartido para que Miguel, Tierra, Jaime y Nick se apunten a las recogidas de los lunes y martes por la noche en Benidorm.

## Reglas
- Tierra (coche grande) cubre la noche él solo y se apunta a la semana entera.
- Sin Tierra hacen falta dos coches: Miguel con su esposa cuenta como 2, el resto como 1.
- Cualquier noche se puede marcar como "Sin recogida".

## Puesta en marcha
1. Supabase → SQL Editor → pega `supabase/schema.sql` → Run.
2. Vercel → importa este repositorio y añade las variables de `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API keys, la clave secreta; nunca la publiques)
   - `GROUP_CODE` (el código que meten los padres)
3. Deploy.

## Desarrollo
```
npm install
cp .env.example .env.local   # y rellena las claves
npm run dev
```
