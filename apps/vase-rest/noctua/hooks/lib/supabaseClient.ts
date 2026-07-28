/**
 * Supabase Client — PREPARADO, NO CONECTADO
 * 
 * Para activar Supabase:
 * 1. npm install @supabase/supabase-js
 * 2. Descomentar el código de abajo
 * 3. Agregar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local
 * 4. Reemplazar las funciones mock en /services/ con llamadas reales
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
